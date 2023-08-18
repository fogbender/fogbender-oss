defmodule Fog.Notify.EmailReceiveJob do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Api, Data, Repo, Format}

  def run() do
    {:ok, %{body: %{messages: messages}}} =
      ExAws.SQS.receive_message(sqs_url(),
        attribute_names: :all,
        max_number_of_messages: 1,
        visibility_timeout: 5
      )
      |> ExAws.request()

    case messages do
      [] ->
        # -- can't happen
        :ok

      [m] ->
        data = m.body |> Jason.decode!()
        receipt_handle = m.receipt_handle

        email = data["Message"] |> Jason.decode!()

        case get_workspace(email) do
          nil ->
            :ok

          workspace ->
            :ok = handle_email_in_workspace(workspace, email)
            {:ok, _} = ExAws.SQS.delete_message(sqs_url(), receipt_handle) |> ExAws.request()
            :ok
        end
    end
  end

  def handle_email_in_workspace(nil, _) do
    :ok
  end

  def handle_email_in_workspace(workspace, email) do
    case get_user_name_and_email(email) do
      nil ->
        :ok

      {user_name, user_email} ->
        users = workspace.users |> Enum.filter(fn u -> u.email === user_email end)

        case users do
          [user] ->
            # known user
            :ok = handle_email_from_user(workspace, email, user)

          [] ->
            # unknown user (add to external customer)
            user = get_external_helpdesk_user(workspace, user_email, user_name)
            :ok = handle_email_from_user(workspace, email, user)

          users ->
            handle_same_email_in_multiple_helpdesks(
              user_email,
              user_name,
              workspace,
              email,
              users
            )
        end
    end
  end

  def handle_same_email_in_multiple_helpdesks(user_email, user_name, workspace, email, users) do
    users =
      users
      |> Enum.filter(fn u ->
        u = u |> Repo.preload([:customer])

        case u.customer.name do
          "$Cust_External_" <> _ ->
            false

          _ ->
            true
        end
      end)

    case users do
      [user] ->
        # known user
        :ok = handle_email_from_user(workspace, email, user)

      _ ->
        # user is in multiple helpdesks - send to $Cust_External
        user = get_external_helpdesk_user(workspace, user_email, user_name)
        :ok = handle_email_from_user(workspace, email, user)
    end
  end

  def get_external_helpdesk_user(workspace, user_email, user_name) do
    customer_name = "$Cust_External_#{Fog.Types.WorkspaceId.dump(workspace.id) |> elem(1)}"

    Repo.User.import_external(
      workspace.vendor.id,
      workspace.id,
      customer_name,
      user_email,
      {user_email, user_name, nil, customer_name},
      false
    )
  end

  def handle_email_from_user(workspace, email, user) do
    case retrieve_email_text_from_s3(email) do
      nil ->
        :ok

      {pars0, files} ->
        subject = email["mail"]["commonHeaders"]["subject"]

        {:ok, room} = find_room(workspace, user)
        user_sess = get_user_session(room, user)

        file_ids =
          files
          |> Enum.map(fn {binary, content_type, filename} ->
            cmd = %Api.File.Upload{
              roomId: room.id,
              fileName: filename,
              binaryData: {0, binary},
              fileType: content_type
            }

            {:reply, %Fog.Api.File.Ok{fileId: file_id}, _} = Api.request(cmd, user_sess)

            file_id
          end)

        # NOTE: when both HTML and text are present, we'll opt for text.
        # But if it's HTML-only, we need to make sure to use it.
        pars =
          pars0
          |> Enum.filter(fn
            {:html, _} -> true
            _ -> false
          end)

        case pars do
          [] ->
            pars0
            |> Enum.filter(fn
              {:text, _} -> true
              _ -> false
            end)

          _ ->
            pars
        end

        pars = pars |> Enum.map(fn {_, text} -> text end)

        cmd =
          case file_ids do
            [] ->
              %Api.Message.Create{
                roomId: room.id,
                text: "**Subject:** #{subject}\n\n#{pars}",
                source: "email"
              }

            file_ids ->
              %Api.Message.Create{
                roomId: room.id,
                text: "**Subject:** #{subject}\n\n#{pars}",
                fileIds: file_ids,
                source: "email"
              }
          end

        {:reply, %Fog.Api.Message.Ok{}, _} = Api.request(cmd, user_sess)

        :ok = Api.Event.publish(room)
    end
  end

  def get_user_session(room, user) do
    Api.Session.for_user(
      room.workspace.vendor.id,
      user.helpdesk_id,
      user.id
    )
    |> Api.init()
  end

  def parse_email(email),
    do: email |> convert_crlf |> Mail.Parsers.RFC2822.parse()

  def convert_crlf(text),
    do: text |> String.replace("\n", "\r\n")

  def retrieve_email_text_from_s3(email) do
    bucket = email["receipt"]["action"]["bucketName"]
    object_key = email["receipt"]["action"]["objectKey"]
    {:ok, %{body: body}} = ExAws.S3.get_object(bucket, object_key) |> ExAws.request()

    %Mail.Message{parts: parts} = body |> parse_email

    handle_parts({[], []}, parts)
  end

  def handle_parts(acc, []) do
    acc
  end

  def handle_parts(acc, [
        %Mail.Message{
          multipart: true,
          parts: parts
        }
        | t
      ]) do
    handle_parts(acc, parts ++ t)
  end

  def handle_parts({pars, files}, [
        %Mail.Message{
          headers: %{"content-type" => ["text/html", {"charset", encoding}]},
          body: body
        }
        | t
      ]) do
    # handle weird encodings
    body = :iconv.convert(encoding, "utf-8", body)

    {:ok, id} = Snowflake.next_id()
    {:ok, file} = File.open("/tmp/html-#{id}", [:write])
    IO.binwrite(file, body)
    File.close(file)

    text = body |> Format.convert(Format.Html, Format.Md)

    handle_parts({[{:html, text} | pars], files}, t)
  end

  def handle_parts({pars, files}, [
        %Mail.Message{
          headers: %{"content-type" => ["text/plain", {"charset", "UTF-8"}]},
          body: body
        }
        | t
      ]) do
    text = body |> String.replace("\r\n", "\n\n")
    handle_parts({[{:text, text} | pars], files}, t)
  end

  def handle_parts({pars, files}, [
        %Mail.Message{
          headers: %{"content-type" => ["text/plain", {"charset", encoding}]},
          body: body
        }
        | t
      ]) do
    # handle weird encodings
    body = :iconv.convert(encoding, "utf-8", body)
    text = body |> String.replace("\r\n", "\n\n")
    handle_parts({[{:text, text} | pars], files}, t)
  end

  def handle_parts({pars, files}, [
        %Mail.Message{
          headers: %{
            "content-disposition" => [type | _],
            "content-type" => [content_type, {"name", name}],
            "content-transfer-encoding" => "base64"
          },
          body: body
        }
        | t
      ])
      when type in ["attachment", "inline"] do
    handle_parts({pars, [{body, content_type, name} | files]}, t)
  end

  def handle_parts(acc, [
        part = %Mail.Message{
          headers: _,
          body: _
        }
        | t
      ]) do
    Logger.warning("Unrecognized email part #{inspect(part)}")
    handle_parts(acc, t)
  end

  def get_email_tag(wid) do
    Repo.Tag.create(wid, ":email")
  end

  def create_room(workspace, user) do
    email_tag = get_email_tag(workspace.id)

    room =
      Repo.Room.create_private(workspace.id, [user.id], ["all"], %{
        helpdesk_id: user.helpdesk_id,
        name: user.email,
        tags: [email_tag.id]
      })
      |> Fog.Repo.preload(workspace: :vendor)

    {:ok, room}
  end

  def get_room(workspace, user) do
    room =
      from(r in Data.Room,
        join: h in assoc(r, :helpdesk),
        on: h.id == ^user.helpdesk_id,
        where: r.name == ^user.email
      )
      |> Repo.one()

    email_tag = get_email_tag(workspace.id)

    room =
      Repo.Room.update_tags(room.id, [email_tag.id], [], nil, user.id)
      |> Fog.Repo.preload(workspace: :vendor)

    {:ok, room}
  end

  def find_room(workspace, user) do
    try do
      create_room(workspace, user)
    rescue
      e ->
        case e do
          %Ecto.InvalidChangesetError{
            changeset: %Ecto.Changeset{
              errors: [
                name:
                  {"has already been taken",
                   [
                     constraint: :unique,
                     constraint_name: "room_helpdesk_id_name_index"
                   ]}
              ]
            }
          } ->
            get_room(workspace, user)

          err ->
            Logger.error("Error: #{inspect(err)}")
            {:error, err}
        end
    end
  end

  def get_user_name_and_email(email) do
    [email_name_tuple | _] =
      (email["mail"]["commonHeaders"]["from"] || [])
      |> Enum.map(fn r ->
        case Mail.Parsers.RFC2822.parse_recipient_value(r) do
          [{name, email}] ->
            {name, email}

          [email] ->
            {email, email}
        end
      end)

    email_name_tuple
  end

  def get_workspace(email) do
    (email["receipt"]["recipients"] || [])
    |> Enum.reduce(nil, fn
      _, acc when not is_nil(acc) ->
        acc

      a, _ ->
        case String.split(a, "@") do
          [maybe_widget_id, _] ->
            case maybe_widget_id |> Base.decode16(case: :lower) do
              {:ok, widget_id} ->
                case Repo.Workspace.from_widget_id(widget_id) do
                  {:ok, workspace} ->
                    workspace |> Fog.Repo.preload([:vendor, :users])

                  _ ->
                    nil
                end

              _ ->
                nil
            end

          _ ->
            nil
        end
    end)
  end

  defp sqs_url(), do: Fog.env(:inbox_sqs_url)
end
