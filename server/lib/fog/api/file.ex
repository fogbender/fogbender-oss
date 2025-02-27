defmodule Fog.Api.File do
  require Logger
  use Fog.Api.Handler
  alias Fog.Api.{Session, Perm}
  alias Fog.FileStorage

  @expires_in_sec 7 * 86400

  defmsg(Upload, [
    :roomId,
    :fileName,
    :fileType,
    :metaData,
    :base64Data,
    :binaryData
  ])

  @commands [Upload]

  defmsg(Ok, [:fileId])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    if auth(m, s) do
      binary = get_file_binary(m)
      mime_type = ExMarcel.MimeType.for({:string, binary})

      mime_type =
        case mime_type do
          "application/octet-stream" ->
            try do
              [_ | _] = String.to_charlist(binary)
              # Whatever this file is, we were able to turn into a
              # valid UTF8 string - let's designate it as text/plain
              "text/plain"
            rescue
              _ ->
                mime_type
            end

          _ ->
            mime_type
        end

      case m do
        # NOTE since it's hard to definitely tell what constitutes a binary,
        # let's shift the risk to the user for now
        #   _ when is_binary ->
        #    {:reply, Err.invalid_request(error: "Binaries not supported"), s}

        %Upload{} ->
          file_binary = get_file_binary(m)

          cond do
            byte_size(file_binary) > Application.get_env(:fog, :file_size_limit, 20_971_520) ->
              {:reply, Err.invalid_request(error: "The file size exceeds the maximum limit")}

            true ->
              {:ok, fileId} = handle_command(%{m | fileType: mime_type}, file_binary, s)
              # {:ok, fileId} = handle_command(m, file_binary, s)
              {:reply, %Ok{fileId: fileId}}
          end
      end
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  def auth(%Upload{roomId: roomId}, s) do
    Perm.File.allowed?(s, :upload, room_id: roomId)
  end

  defp get_file_binary(%Upload{
         binaryData: binary_data,
         base64Data: base64_data
       }) do
    case binary_data do
      {0, binary} ->
        binary

      nil ->
        case base64_data do
          "" <> _ ->
            Base.decode64!(base64_data)

          nil ->
            raise("base64Data or binaryData has to be set")
        end
    end
  end

  defp handle_command(
         %Upload{
           metaData: nil,
           roomId: roomId,
           fileName: filename,
           fileType: file_type
         },
         file_binary,
         sess
       ) do
    # this conversion seems like a bug, but I don't know who is responsible

    content_type = Fog.Utils.escape_mime(file_type)
    file_ext = Path.extname(filename)
    {:ok, file_path} = FileStorage.upload(file_binary, content_type, file_ext)

    {type, thumbnail} =
      case try_create_thumbnail(content_type, filename, file_binary) do
        :not_image ->
          {"attachment:other", nil}

        {:ok, json} ->
          {"attachment:image", json}

        {:error, err} ->
          Logger.error("Failed to create thumbnail", err: err)

          {"attachment:other", nil}
      end

    create_file(
      roomId,
      filename,
      content_type,
      type,
      byte_size(file_binary),
      file_path,
      thumbnail,
      nil,
      sess
    )
  end

  defp handle_command(
         %Upload{
           metaData: meta_data,
           roomId: roomId,
           fileName: filename,
           fileType: _file_type
         },
         _file_binary,
         sess
       ) do
    type = "metadata"
    content_type = "application/json"
    thumbnail = nil
    file_path = nil
    file_size = 0

    create_file(
      roomId,
      filename,
      content_type,
      type,
      file_size,
      file_path,
      thumbnail,
      meta_data,
      sess
    )
  end

  defp create_file(
         roomId,
         filename,
         content_type,
         type,
         file_size,
         file_path,
         thumbnail,
         meta_data,
         sess
       ) do
    %Fog.Data.File{id: fileId} =
      Fog.Repo.File.create(%{
        content_type: content_type,
        filename: filename,
        data: %{
          room_id: roomId,
          from_user_id: author(:user, sess),
          from_agent_id: author(:agent, sess),
          type: type,
          size: file_size,
          file_s3_file_path: file_path,
          meta_data: meta_data,
          thumbnail: thumbnail
        }
      })

    {:ok, fileId}
  end

  defp author(:user, %Session.User{userId: userId}), do: userId
  defp author(:agent, %Session.Agent{agentId: agentId}), do: agentId
  defp author(_, _), do: nil

  def try_create_thumbnail(content_type, filename, binary, size \\ "640x640\>")

  def try_create_thumbnail("image/" <> _, filename, file_binary, size) do
    {:ok, path} = Briefly.create(extname: filename)
    {:ok, path_jpg} = Briefly.create(extname: "thumb.jpg")

    try do
      File.write!(path, file_binary)

      image =
        Mogrify.open(path)
        |> Mogrify.verbose()
        |> Mogrify.auto_orient()

      original = %{
        original_width: image.width,
        original_height: image.height
      }

      :console.log({original, path_jpg})

      try do
        image =
          image
          |> Mogrify.resize(size)

        {format, image} =
          case image do
            %Mogrify.Image{animated: true, format: "gif"} ->
              image
              |> Mogrify.custom("coalesce")

              {"gif", image}

            image ->
              {"png", image}
          end

        image
        |> Mogrify.format(format)
        |> Mogrify.save(in_place: true)

        thumnail_binary = File.read!(path)

        {file_binary, file_path} =
          case format do
            "png" ->
              image
              |> Mogrify.format("jpg")
              |> Mogrify.save(path: path_jpg)

              thumnail_binary_jpg = File.read!(path_jpg)

              if byte_size(thumnail_binary_jpg) < byte_size(thumnail_binary) do
                {thumnail_binary_jpg, path_jpg}
              else
                {thumnail_binary, path}
              end

            _ ->
              {thumnail_binary, path}
          end

        original =
          case format do
            "gif" ->
              try_creating_tiny_thumb(original, path)

            _ ->
              original
          end

        %Mogrify.Image{width: width, height: height, ext: ext, format: format} =
          Mogrify.open(file_path)
          |> Mogrify.verbose()

        content_type = "image/#{format}"

        {:ok,
         Map.merge(
           original,
           %{
             content_type: content_type,
             filename: "thumbnail#{ext}",
             width: width,
             height: height,
             size: byte_size(file_binary),
             url: "data:#{content_type};base64,#{Base.encode64(file_binary)}"
           }
         )}
      rescue
        err ->
          Logger.error(
            "Failed to create thumbnail #{inspect(err)}\n" <>
              Exception.format(:error, err, __STACKTRACE__)
          )

          {:ok, original}
      end
    rescue
      err ->
        {:error, err}
    after
      File.rm(path)
      File.rm(path_jpg)
    end
  end

  def try_create_thumbnail(_content_type, _filename, _file_binary, _size) do
    :not_image
  end

  def try_creating_tiny_thumb(original, path) do
    {:ok, tiny_path} = Briefly.create(extname: "tiny_thumb.gif")

    try do
      File.copy!(path, tiny_path)

      # playing with fire a bit, but hopefully if tiny_path is not based on user input we are safe
      {thumb_binary, 0} =
        System.cmd("convert", [tiny_path <> "[0]", "-resize", "64x64", "webp:-"])

      Map.merge(original, %{
        thumbnailDataUrl: "data:image/webp;base64,#{Base.encode64(thumb_binary)}"
      })
    rescue
      err ->
        Logger.error(
          "Failed to create tiny thumbnail #{inspect(err)}\n" <>
            Exception.format(:error, err, __STACKTRACE__)
        )

        {:ok, original}
    after
      File.rm(tiny_path)
    end
  end

  def file_to_file_info(f) do
    if f.data["type"] == "metadata" do
      nil
    else
      attachment_to_file_info(f)
    end
  end

  defp attachment_to_file_info(f) do
    %{
      id: f.id,
      filename: f.filename,
      contentType: f.content_type,
      thumbnail: f.data["thumbnail"],
      type: f.data["type"],
      fileSize: f.data["size"],
      fileExpirationTs: Fog.Utils.time_us() + get_expires_in_us(),
      downloadUrl:
        FileStorage.download_url(
          f.data["file_s3_file_path"],
          f.filename,
          @expires_in_sec
        ),
      fileUrl: FileStorage.file_url(f.data["file_s3_file_path"])
    }
  end

  defp get_expires_in_us do
    # say that it expires a bit earlier than it actually does
    @expires_in_sec * 1000 * 900
  end
end
