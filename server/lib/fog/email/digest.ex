defmodule Fog.Email.Digest do
  import Fog.Gettext, only: [ngettext: 3]
  require EEx
  require Logger
  alias Fog.{Repo, Data, Mailer, Email}

  @template "priv/emails/email_digest"
  @template2 "priv/emails/email_digest2"
  @token_exp 7 * 24 * 3600

  def send(%Data.EmailDigest{email_digest_template: "email_digest_teamedup"} = data) do
    Email.DigestTeamedUp.send(data)
  end

  def send(%Data.EmailDigest{:to_type => "agent"} = data) do
    to = recipient(data)
    Logger.info("Sending email digest to #{to.email} (#{data.to_type})")

    Bamboo.Email.new_email(
      to: to.email,
      from: Mailer.source(),
      subject: "New messages from Fogbender",
      html_body: html(data),
      text_body: text(data)
    )
    |> Mailer.send()
  end

  def send(%Data.EmailDigest{:to_type => "user"} = data) do
    to = recipient(data)
    Logger.info("Sending email digest to #{to.email} (#{data.to_type})")

    Bamboo.Email.new_email(
      to: to.email,
      from: Mailer.source("#{data.vendor.name} Support"),
      subject: "New messages from #{data.vendor.name} Support",
      html_body: html(data),
      text_body: text(data)
    )
    |> Mailer.send()
  end

  EEx.function_from_file(:def, :text1, @template <> ".txt.eex", [:data])
  EEx.function_from_file(:def, :html1, @template <> ".html.eex", [:data])

  EEx.function_from_file(:def, :text2, @template2 <> ".txt.eex", [:data])
  EEx.function_from_file(:def, :html2, @template2 <> ".html.eex", [:data])

  def text(%Data.EmailDigest{email_digest_template: "email_digest"} = data), do: text1(data)
  def text(%Data.EmailDigest{email_digest_template: "email_digest2"} = data), do: text2(data)

  def html(%Data.EmailDigest{email_digest_template: "email_digest"} = data), do: html1(data)
  def html(%Data.EmailDigest{email_digest_template: "email_digest2"} = data), do: html2(data)

  def content_tag(tag, content, attrs) do
    Phoenix.HTML.Safe.to_iodata(Phoenix.HTML.Tag.content_tag(tag, content, attrs))
  end

  defp author(%Data.Message{from_user: u, from_agent: a}), do: u || a

  defp author_name(%Data.Message{} = message) do
    author = author(message)
    message.from_name_override || author.name
  end

  defp recipient(%Data.EmailDigest{to_type: "agent", agent: agent}), do: agent
  defp recipient(%Data.EmailDigest{to_type: "user", user: user}), do: user

  defp link_room_name(%Data.EmailDigest{to_type: "agent"}, b) do
    messageId = b.first_unread_message.id

    "#{Fog.env(:fog_storefront_url)}/admin/vendor/#{b.vendor_id}/" <>
      "workspace/#{b.workspace_id}/chat/#{b.room.id}/#{messageId}"
  end

  defp link_room_name(%Data.EmailDigest{to_type: "user", user: %Data.User{id: id}}, b) do
    email_token = Fog.Token.for_email(id, @token_exp)

    "#{Fog.env(:fog_api_url)}/public/redirect_to_client/?#{URI.encode_query(%{token: email_token, room_id: b.room.id}, :rfc3986)}"
  end

  defp badge_room_name(%Data.Badge{room: %Data.Room{type: "dialog"}} = b) do
    "Dialog with #{author(b.first_unread_message).name}"
  end

  defp badge_room_name(%Data.Badge{room: %Data.Room{} = r} = b) do
    display_name(b.agent_id, r.display_name_for_agent) ||
      display_name(b.user_id, r.display_name_for_user) ||
      b.room.name
  end

  defp display_name(nil, _), do: nil
  defp display_name(_, nil), do: nil
  defp display_name(_, name), do: name

  def message_text(message, sep \\ "\n")

  def message_text(%Data.Message{link_type: "forward", sources: sources}, sep)
      when is_list(sources) and sources != [] do
    text =
      sources
      |> Enum.map(& &1.text)
      |> Enum.join(sep)

    "(forwarded) " <> text
  end

  def message_text(%Data.Message{link_type: "reply", text: text}, _sep) do
    "(replied) " <> text
  end

  def message_text(%Data.Message{text: text}, _sep), do: text

  defp t_new_messages(count), do: ngettext("one new message", "%{count} new messages", count)
  defp t_mentions(count), do: ngettext("one mention", "%{count} mentions", count)
  defp t_rooms(count), do: ngettext("one room", "%{count} rooms", count)
  defp t_more_rooms(count), do: ngettext("one more room", "%{count} more rooms", count)

  defp t_earlier_messages(count),
    do: ngettext("one earlier message", "%{count} earlier messages", count)

  defp t_unread_messages(count),
    do: ngettext("one unread message", "%{count} unread messages", count)
end
