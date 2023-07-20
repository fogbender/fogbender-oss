defmodule Fog.Comms.Slack.Utils do
  require Logger

  import Ecto.Query

  alias Fog.{Api, Data, Repo, Utils}
  alias Fog.Comms.{Slack}

  def truncate(text, padding) do
    max = 1697

    text = text |> String.slice(0..(max - 1 - String.length(padding)))

    case text |> String.length() == max do
      true ->
        "#{text |> String.slice(0..(max - 2 - String.length(padding)))}…"

      false ->
        text
    end
  end

  def message_text(message, padding \\ "")

  def message_text(%Data.Message{files: []} = message, padding) do
    text(message) |> truncate(padding)
  end

  def message_text(%Data.Message{text: ""}, _padding), do: "/uploaded file(s)/"

  def message_text(%Data.Message{} = message, padding) do
    text(message) |> truncate(padding)
  end

  def text(%Data.Message{text: text} = message) do
    case message.link_type do
      "reply" ->
        replies_to =
          message.sources
          |> Enum.map(fn source_message ->
            author = Utils.get_author(source_message)
            source_text = message_text(source_message)

            "> *#{author.name}:* #{source_text}\n"
          end)
          |> Enum.join()

        "#{replies_to}#{text}"

      "forward" ->
        forwarded =
          message.sources
          |> Enum.map(fn source_message ->
            author = Utils.get_author(source_message)
            source_text = message_text(source_message)

            "> *#{author.name}:* #{source_text}\n"
          end)
          |> Enum.join()

        "#{text}\n\n#{forwarded}"

      _ ->
        text
    end
  end

  def file_ids(_, _, files, _) when is_nil(files), do: nil

  def file_ids(access_token, room_id, files, sess) when is_list(files) do
    files
    |> Enum.map(fn file ->
      with {:ok, file_info} <- Slack.Api.file_info(access_token, file["id"]),
           "https://files.slack.com/" <> path <- file_info["file"]["url_private_download"],
           {:ok, body} = Slack.Api.download_file(access_token, path),
           cmd <- %Api.File.Upload{
             roomId: room_id,
             fileName: file_info["file"]["name"],
             fileType: file_info["file"]["mimetype"],
             # to emulate websocket binary data
             binaryData: {0, body}
           },
           {:reply, %Api.File.Ok{fileId: file_id}} = Api.File.info(cmd, sess) do
        file_id
      else
        error ->
          Logger.error("Failed to get file from Slack #{inspect(file)} #{inspect(error)}")
          nil
      end
    end)
    |> Enum.filter(&(not is_nil(&1)))
  end

  def slack_links_to_markdown(text, _, nil) do
    text
  end

  def slack_links_to_markdown(_, regex, %{
        "head" => head,
        "tail" => tail,
        "url" => url,
        "url_text" => url_text
      }) do
    text = "#{head}[#{url_text}](#{url})#{tail}"
    slack_links_to_markdown(text, regex, Regex.named_captures(regex, text))
  end

  def slack_links_to_markdown(text) do
    regex = ~r/(?<head>[^<]*)<(?<url>[^|]+)\|(?<url_text>[^>]+)>(?<tail>.*)/
    slack_links_to_markdown(text, regex, Regex.named_captures(regex, text))
  end

  def get_helpdesk_user(workspace, customer, user_email, user_name, avatar_url) do
    Repo.User.import_external(
      workspace.vendor_id,
      workspace.id,
      customer.external_uid,
      user_email,
      {user_email, user_name, avatar_url, customer.name}
    )
  end

  defp email_name_avatar(access_token, user_id) do
    case Slack.Api.users_info(access_token, user_id) do
      {:ok,
       %{
         "ok" => true,
         "user" => %{
           "profile" => %{
             "email" => email,
             "real_name_normalized" => name,
             "image_24" => avatar_url
           }
         }
       }} ->
        {email, name, avatar_url}

      {:ok, _} ->
        {nil, nil, nil}
    end
  end

  def resolve_fog_user_by_slack_user_id(access_token, slack_team_id, slack_user_id, helpdesk_id) do
    user =
      from(
        u in Data.User,
        join: m in Data.SlackCustomerUserMapping,
        on:
          u.id == m.user_id and m.slack_team_id == ^slack_team_id and
            m.slack_user_id == ^slack_user_id and m.helpdesk_id == ^helpdesk_id
      )
      |> Repo.one()

    case user do
      nil ->
        {email, name, avatar_url} = email_name_avatar(access_token, slack_user_id)

        helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:workspace, :customer])

        user = get_helpdesk_user(helpdesk.workspace, helpdesk.customer, email, name, avatar_url)

        %Data.SlackCustomerUserMapping{} =
          Data.SlackCustomerUserMapping.new(
            user_id: user.id,
            slack_team_id: slack_team_id,
            slack_user_id: slack_user_id,
            helpdesk_id: helpdesk.id
          )
          |> Repo.insert!()

        user

      %Data.User{} = user ->
        user
    end
  end

  def author_sess(%{helpdesk_id: helpdesk_id}, %Data.User{} = user) do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])
    Api.Session.for_user(helpdesk.vendor.id, helpdesk.id, user.id)
  end

  def author_sess(%{helpdesk_id: helpdesk_id}, %Data.Agent{} = agent) do
    helpdesk = Repo.Helpdesk.get(helpdesk_id) |> Repo.preload([:vendor])
    Api.Session.for_agent(helpdesk.vendor.id, agent.id)
  end
end
