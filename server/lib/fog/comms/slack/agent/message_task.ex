defmodule Fog.Comms.Slack.Agent.MessageTask do
  require Logger

  import Ecto.Query, only: [from: 2]

  alias Fog.{Api, Data, Repo, Utils, FileStorage}
  alias Fog.Comms.{Slack}

  @broadcast_threshold_seconds 3600

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(cmd, message, sess) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :run, [cmd, message, sess])

    :ok
  end

  def run(
        %Api.Message.Create{fromApp: from_app} = cmd,
        %Data.Message{room_id: room_id} = message,
        sess
      )
      when from_app !== "slack" do
    :ok = f0(cmd, message, get_slack_integrations(room_id), sess)
  end

  def run(
        %Api.Message.SetReaction{fromApp: from_app} = cmd,
        %Data.Message{room_id: room_id} = message,
        sess
      )
      when from_app !== "slack" do
    :ok = f0(cmd, message, get_slack_integrations(room_id), sess)
  end

  def run(
        %Api.Message.Update{fromApp: from_app} = cmd,
        %Data.Message{room_id: room_id} = message,
        sess
      )
      when from_app !== "slack" do
    :ok = f0(cmd, message, get_slack_integrations(room_id), sess)
  end

  def run(_, _, _), do: :ok

  def f0(_, _, [], _), do: :ok

  def f0(cmd, message, [%Data.WorkspaceIntegration{specifics: specifics} = integration | t], sess) do
    access_token = specifics["access_token"]

    case access_token do
      nil ->
        :ok

      _ ->
        f1(cmd, message, integration, sess)
    end

    f0(cmd, message, t, sess)
  end

  def f0(_, _, _), do: :ok

  defp f1(
         cmd,
         message,
         integration,
         sess
       ) do
    agent_id = Api.Message.author(:agent, sess)
    author = Utils.get_author_with_overrides(message, sess)

    is_bot =
      if agent_id do
        author.is_bot and is_nil(author.from_name_override)
      else
        false
      end

    if is_bot do
      :ok
    else
      f2(cmd, author, message, integration, sess)
    end
  end

  defp f2(cmd, author, message, integration, _sess) do
    %{
      "access_token" => access_token,
      #      "team_name" => team_name,
      #      "user_info" => user_info,
      "linked_channel_id" => linked_channel_id
    } = integration.specifics

    slack_team_id = integration.project_id

    #    if is_nil(cmd.fromApp) do
    #      %Data.Message{room_id: room_id} = message
    #      room = Repo.Room.get(room_id) |> Repo.preload(tags: :tag)
    #      helpdesk_id = room.helpdesk_id
    #
    #      shared_channel_helpdesk_associations =
    #        integration.specifics["shared_channel_helpdesk_associations"] || []
    #
    #      case shared_channel_helpdesk_associations
    #           |> Enum.find(&(&1["helpdesk_id"] === helpdesk_id)) do
    #        nil ->
    #          nil
    #
    #        %{"shared_channel_id" => shared_channel_id} ->
    #          _helpdesk_integration =
    #            Slack.Agent.Hook.load_helpdesk_integration(
    #              access_token: access_token,
    #              bot_user_info: user_info,
    #              team_name: team_name,
    #              team_id: slack_team_id,
    #              channel_id: shared_channel_id,
    #              helpdesk_id: helpdesk_id
    #            )
    #
    #          # :ok = Slack.Customer.MessageTask.f0(cmd, message, room, helpdesk_integration, sess)
    #      end
    #    end

    cond do
      is_nil(access_token) ->
        :ok

      is_nil(linked_channel_id) ->
        :ok

      true ->
        f3(cmd, linked_channel_id, access_token, author, message, slack_team_id)
    end
  end

  defp f3(
         cmd,
         linked_channel_id,
         access_token,
         author,
         %Data.Message{room_id: room_id} = message,
         slack_team_id
       ) do
    message = message |> Repo.preload(:files)

    case Repo.SlackChannelMapping.thread_id(linked_channel_id, room_id) do
      nil ->
        f4(linked_channel_id, access_token, author, message)

      thread_id ->
        f5(cmd, thread_id, linked_channel_id, access_token, author, message, slack_team_id)
    end
  end

  defp f4(linked_channel_id, access_token, author, %Data.Message{room_id: room_id} = message) do
    name = author |> Utils.author_name()
    avatar_url = author_avatar_url(author)
    room = Repo.Room.get(room_id) |> Repo.preload(:customer)

    ok =
      not is_nil(room) and
        not String.starts_with?(room.customer.name, "$Cust_Internal") and
        (room.type === "public" or (not is_nil(room.agent_groups) and "all" in room.agent_groups))

    case ok do
      false ->
        :ok

      true ->
        text = Slack.Utils.message_text(message)

        {:ok, %{"ts" => thread_id}} =
          Slack.Api.send_message(
            access_token,
            linked_channel_id,
            # thread_id
            nil,
            # name,
            nil,
            # avatar_url,
            nil,
            text,
            # meta
            nil,
            blocks(author, room, message)
          )

        %Data.SlackChannelMapping{} =
          Repo.SlackChannelMapping.create(
            room_id: room_id,
            channel_id: linked_channel_id,
            thread_id: thread_id
          )

        message = message |> Repo.preload(:files)

        case message.files do
          [] ->
            {:ok, %{"message" => %{"ts" => message_ts}}} =
              Slack.Api.send_message(
                access_token,
                linked_channel_id,
                thread_id,
                name,
                avatar_url,
                text
              )

            %Data.SlackMessageMapping{} =
              Repo.SlackMessageMapping.create(
                message_id: message.id,
                slack_message_ts: message_ts,
                slack_channel_id: linked_channel_id
              )

            :ok

          files ->
            :ok =
              upload_files(
                access_token,
                author,
                linked_channel_id,
                thread_id,
                message.id,
                text,
                files
              )
        end
    end
  end

  defp f5(
         %Api.Message.Create{},
         thread_id,
         linked_channel_id,
         access_token,
         author,
         %Data.Message{files: files} = message,
         _
       )
       when files != [] do
    %Data.Message{id: message_id, text: text} = message

    :ok =
      upload_files(access_token, author, linked_channel_id, thread_id, message_id, text, files)
  end

  defp f5(
         %Api.Message.Create{},
         thread_id,
         linked_channel_id,
         access_token,
         author,
         %Data.Message{} = message,
         slack_team_id
       ) do
    %Data.Message{id: message_id, text: text, room_id: room_id, inserted_at: ts0} = message
    name = author |> Utils.author_name()
    avatar_url = author_avatar_url(author)
    reply_broadcast = calc_reply_broadcast(room_id, author, message, ts0)

    text =
      message.mentions
      |> Enum.reduce(text, fn
        %Data.Mention{agent_id: nil}, text ->
          text

        %Data.Mention{text: mention_text, agent_id: agent_id}, text ->
          case Repo.SlackAgentMapping.slack_user_id(agent_id, slack_team_id) do
            nil ->
              text

            slack_user_id ->
              text |> String.replace("@#{mention_text}", "<@#{slack_user_id}>")
          end
      end)

    {:ok, %{"message" => %{"ts" => slack_message_ts}}} =
      Slack.Api.send_message(
        access_token,
        linked_channel_id,
        thread_id,
        name,
        avatar_url,
        text,
        nil,
        [],
        reply_broadcast
      )

    %Data.SlackMessageMapping{} =
      Repo.SlackMessageMapping.create(
        message_id: message_id,
        slack_message_ts: slack_message_ts,
        slack_channel_id: linked_channel_id
      )

    :ok
  end

  defp f5(
         %Api.Message.SetReaction{reaction: reaction},
         _,
         linked_channel_id,
         access_token,
         %{id: author_id},
         %Data.Message{id: message_id} = message,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        case reaction do
          nil ->
            :ok =
              remove_reaction(
                message,
                author_id,
                access_token,
                linked_channel_id,
                slack_message_ts
              )

          reaction ->
            :ok = add_reaction(reaction, access_token, linked_channel_id, slack_message_ts)
        end
    end
  end

  defp f5(
         %Api.Message.Update{messageId: message_id, text: nil},
         _,
         linked_channel_id,
         access_token,
         _,
         _,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        {:ok, _} = Slack.Api.delete_message(access_token, linked_channel_id, slack_message_ts)

        :ok
    end
  end

  defp f5(
         %Api.Message.Update{messageId: message_id, text: text},
         _,
         linked_channel_id,
         access_token,
         _,
         _,
         _
       ) do
    case Repo.SlackMessageMapping.slack_message_ts(message_id, linked_channel_id) do
      nil ->
        :ok

      slack_message_ts ->
        {:ok, _} =
          Slack.Api.update_message(access_token, linked_channel_id, slack_message_ts, text)

        :ok
    end
  end

  defp calc_reply_broadcast(room_id, author, message, ts0) do
    case author do
      %Data.Agent{} ->
        false

      %Data.User{} ->
        messages_query = from(m in Fog.Data.Message, order_by: [desc: m.inserted_at], limit: 5)
        room = Repo.Room.get(room_id) |> Repo.preload(messages: messages_query)

        case room.messages |> Enum.find(fn m -> m.id != message.id end) do
          nil ->
            false

          %Data.Message{inserted_at: ts1} ->
            DateTime.diff(ts0, ts1) > @broadcast_threshold_seconds
        end
    end
  end

  defp remove_reaction(message, author_id, access_token, linked_channel_id, slack_message_ts) do
    reaction =
      message.reactions
      |> Enum.find_value(fn
        %Data.MessageReaction{:agent_id => ^author_id, :reaction => reaction} -> reaction
        %Data.MessageReaction{:user_id => ^author_id, :reaction => reaction} -> reaction
        _ -> false
      end)

    case reaction do
      nil ->
        :ok

      reaction ->
        case Exmoji.Scanner.scan(reaction) do
          [%Exmoji.EmojiChar{short_name: short_name}] ->
            case Slack.Api.remove_reaction(
                   access_token,
                   linked_channel_id,
                   slack_message_ts,
                   short_name
                 ) do
              {:ok, _} ->
                :ok
            end

          _ ->
            :ok
        end
    end
  end

  defp add_reaction(reaction, access_token, linked_channel_id, slack_message_ts) do
    case Exmoji.Scanner.scan(reaction) do
      [%Exmoji.EmojiChar{short_name: short_name}] ->
        case Slack.Api.add_reaction(access_token, linked_channel_id, slack_message_ts, short_name) do
          {:ok, _} ->
            :ok

          {:error, %{"error" => "already_reacted"}} ->
            :ok
        end

      _ ->
        :ok
    end
  end

  defp blocks(author, room, message) do
    room = room |> Repo.preload([:customer, [helpdesk: [:users, :rooms]], :workspace, :vendor])
    vendor = room.vendor
    workspace = room.workspace
    customer = room.customer

    max_header_length = 64

    header_text =
      "#{Repo.Helpdesk.printable_customer_name(customer.name)}: #{room.name}"
      |> String.slice(0..(max_header_length - 1))

    header_text =
      case header_text |> String.length() == max_header_length do
        true ->
          "#{header_text |> String.slice(0..(max_header_length - 2))}…"

        false ->
          header_text
      end

    author_text = "*#{author |> Utils.author_name()}* (<mailto:#{author.email}|#{author.email}>)"

    text = message |> Slack.Utils.message_text("#{author_text}: ")

    [
      %{
        "type" => "header",
        "text" => %{
          "type" => "plain_text",
          "text" => header_text,
          "emoji" => true
        }
      },
      %{
        "type" => "section",
        "text" => %{
          "type" => "mrkdwn",
          "text" => "#{author_text}: #{text}"
        }
      },
      %{
        "type" => "section",
        "text" => %{
          "type" => "mrkdwn",
          "text" =>
            "<#{Utils.message_url(vendor.id, workspace.id, room.id, message.id)}|Respond in Fogbender>",
          "verbatim" => true
        }
      }
    ]
  end

  defp author_avatar_url(author) do
    case author do
      %Data.User{image_url: "https://avatars.dicebear.com" <> _ = image_url} ->
        image_url |> String.replace(".svg", ".png")

      _ ->
        case author do
          %Data.User{} ->
            author.image_url

          %Data.Agent{} ->
            author.from_image_url_override || author.image_url
        end
    end
  end

  def get_slack_integrations(room_id) do
    from(
      i in Data.WorkspaceIntegration,
      join: w in assoc(i, :workspace),
      join: r in assoc(w, :rooms),
      on: r.id == ^room_id and i.type == "slack"
    )
    |> Repo.all()
  end

  defp upload_files(access_token, author, linked_channel_id, thread_id, message_id, text, files) do
    files
    |> Enum.with_index()
    |> Enum.each(fn {file, i} ->
      try do
        %Fog.Data.File{
          filename: filename,
          content_type: content_type,
          data: data
        } = file

        file_path = data["file_s3_file_path"] || data["file_path"]
        {:ok, file_body} = FileStorage.read(file_path)

        # XXX response with no shares
        _m = """
        {:ok,
          %{"file" => %{
            "timestamp" => 1670864603,
            "external_type" => "",
            "mimetype" => "image/png",
            "title" => "image001",
            "original_w" => 61,
            "channels" => [],
            "id" => "F04EMSJPTGE",
            "user_team" => "T04CYSQK5G9",
            "permalink_public" => "https://slack-files.com/T04CYSQK5G9-F04EMSJPTGE-737d97e3d8",
            "user" => "U04CYUARB41",
            "thumb_64" => "https://files.slack.com/files-tmb/T04CYSQK5G9-F04EMSJPTGE-5ab6a5e8ad/image001_64.png",
            "editable" => false,
            "pretty_type" => "PNG",
            "comments_count" => 0,
            "file_access" => "visible",
            "created" => 1670864603,
            "thumb_360" => "https://files.slack.com/files-tmb/T04CYSQK5G9-F04EMSJPTGE-5ab6a5e8ad/image001_360.png",
            "thumb_360_h" => 74,
            "ims" => [],
            "thumb_160" => "https://files.slack.com/files-tmb/T04CYSQK5G9-F04EMSJPTGE-5ab6a5e8ad/image001_160.png",
            "is_public" => true,
            "is_starred" => false,
            "original_h" => 74,
            "groups" => [],
            "filetype" => "png",
            "thumb_tiny" => "AwAwACfMoAJOAM0/Yq/fb8BQZOMINooAXyuwYFvSoyMHmin7w3DjPv3oAZRT/LB5RgaTy29qAFl6qfUUynj5osd1/lTKAADJ4p3lPjpTgdkYI+83emDczcZzQA9MqrE/Sk8ynHLKUJyVpvlNQA1WKtkU5lBG5OncelMpVYqcigBx+aNSP4eDSmTjgYY9TR5gHIXDH8qTzB12LmgBY/kUue/Ap3ne1RMxY5NJQB//2Q==",
            "mode" => "hosted",
            "thumb_360_w" => 61,
            "size" => 2847,
            "username" => "",
            "url_private_download" => "https://files.slack.com/files-pri/T04CYSQK5G9-F04EMSJPTGE/download/image001.png",
            "public_url_shared" => false,
            "display_as_bot" => false,
            "has_rich_preview" => false,
            "thumb_80" => "https://files.slack.com/files-tmb/T04CYSQK5G9-F04EMSJPTGE-5ab6a5e8ad/image001_80.png",
            "permalink" => "https://fogbender---test00.slack.com/files/U04CYUARB41/F04EMSJPTGE/image001.png",
            "url_private" => "https://files.slack.com/files-pri/T04CYSQK5G9-F04EMSJPTGE/image001.png",
            "shares" => %{},
            "media_display_type" => "unknown",
            "name" => "image001.png",
            "is_external" => false},
            "ok" => true}}
        """

        res =
          Slack.Api.upload_file(
            access_token,
            linked_channel_id,
            thread_id,
            filename,
            content_type,
            file_body,
            if i === 0 do
              "[#{author.name}]: #{text}"
            else
              ""
            end
          )

        slack_messages =
          case res do
            {:ok, %{"file" => %{"shares" => %{"public" => slack_messages}}}} -> slack_messages
            {:ok, %{"file" => %{"shares" => %{"private" => slack_messages}}}} -> slack_messages
          end

        {_team_id, [%{"ts" => slack_message_ts} | _]} = Enum.at(slack_messages, 0)

        %Data.SlackMessageMapping{} =
          Repo.SlackMessageMapping.create(
            message_id: message_id,
            slack_message_ts: slack_message_ts,
            slack_channel_id: linked_channel_id
          )
      rescue
        e ->
          Logger.error("Failed to upload a file to Slack: #{inspect(e)}")
          {:error, e}
      end
    end)

    :ok
  end
end
