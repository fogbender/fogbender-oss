defmodule Fog.Email.DigestTeamedUp do
  require EEx
  alias Fog.{Data, Mailer, Token}
  require Logger

  @template "priv/emails/email_digest_teamedup"
  @source {"TeamedUp", "support@teamedupapp.com"}
  @token_exp 365 * 24 * 60 * 60

  def send(%Data.EmailDigest{} = data) do
    to = recipient(data)
    Logger.info("Sending email digest (TeamedUp) to #{to.email} (#{data.to_type})")

    Bamboo.Email.new_email(
      to: to.email,
      from: @source,
      subject: "New messages from TeamedUp",
      html_body: html(data),
      text_body: text(data)
    )
    |> Mailer.send()
  end

  EEx.function_from_file(:def, :text, @template <> ".txt.eex", [:data])
  EEx.function_from_file(:def, :html, @template <> ".html.eex", [:data])

  defp author(%Data.Message{from_user: u, from_agent: a}), do: u || a

  defp recipient(%Data.EmailDigest{to_type: "agent", agent: agent}), do: agent
  defp recipient(%Data.EmailDigest{to_type: "user", user: user}), do: user

  defp badge_room_name(%Data.Badge{room: %Data.Room{type: "dialog"}} = b) do
    "Dialog with #{author(b.first_unread_message).name}"
  end

  defp badge_room_name(b), do: b.room.name

  defp badge_room_url(b) do
    "https://production.teamedupapp.com/recent_activity?channelId=#{b.room.id}"
    |> URI.encode()
  end

  defp unsubscribe_url(%Data.User{id: user_id}) do
    email_token = Token.for_unsubscribe_email(user_id, @token_exp)

    "https://production.teamedupapp.com/unsubscribe?" <>
      URI.encode_query(email_token: email_token)
  end

  defp unsubscribe_url(_), do: "#"
end
