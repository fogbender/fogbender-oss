defmodule Fog.Comms.Slack.RichTextToMarkdown do
  alias Fog.{Api, Data, Repo}

  def convert([%{"type" => "rich_text", "elements" => elements}], known_slack_user_ids) do
    known_users_map =
      Enum.into(known_slack_user_ids, %{}, fn %Data.SlackAgentMapping{
                                                agent_id: agent_id,
                                                slack_user_id: slack_user_id
                                              } ->
        {slack_user_id, Repo.Agent.get(agent_id).name}
      end)

    markdown =
      elements
      |> Enum.map(fn e -> convert_element(e, known_users_map) end)
      |> Enum.join("\n")

    {text, mentions} = slack_user_ids_to_mentions(known_slack_user_ids, markdown)

    {text, mentions}
  end

  def convert(_), do: :unsupported

  defp convert_element(%{"type" => "rich_text_section", "elements" => elements}, known_users_map) do
    elements
    |> Enum.map(&convert_sub_element(&1, known_users_map))
    |> Enum.join("")
  end

  defp convert_element(
         %{"type" => "rich_text_list", "elements" => elements, "style" => "bullet"},
         known_users_map
       ) do
    elements
    |> Enum.map(&convert_list_item(&1, known_users_map))
    |> Enum.join("\n")
  end

  defp convert_element(
         %{"type" => "rich_text_list", "elements" => elements, "style" => "ordered"},
         known_users_map
       ) do
    elements
    |> Enum.with_index(1)
    |> Enum.map(fn {item, index} -> "#{index}. " <> convert_list_item(item, known_users_map) end)
    |> Enum.join("\n")
  end

  defp convert_element(
         %{"type" => "rich_text_preformatted", "elements" => elements},
         known_users_map
       ) do
    elements
    |> Enum.map(&convert_sub_element(&1, known_users_map))
    |> Enum.join("")
    |> wrap_in_code_block()
  end

  defp convert_element(%{"type" => "rich_text_quote", "elements" => elements}, known_users_map) do
    elements
    |> Enum.map(&convert_sub_element(&1, known_users_map))
    |> Enum.join("")
    |> wrap_in_blockquote()
  end

  defp convert_sub_element(
         %{"type" => "text", "text" => text, "style" => style},
         _known_users_map
       ) do
    text
    |> apply_styles(style)
  end

  defp convert_sub_element(%{"type" => "text", "text" => text}, _known_users_map), do: text

  defp convert_sub_element(%{"type" => "user", "user_id" => user_id}, _known_users_map) do
    "<@#{user_id}>"
  end

  defp convert_sub_element(%{"type" => "channel", "channel_id" => channel_id}, _known_users_map) do
    "##{channel_id}"
  end

  defp convert_sub_element(%{"type" => "link", "url" => url, "text" => text}, _known_users_map) do
    "[#{text}](#{url})"
  end

  defp convert_sub_element(%{"type" => "link", "url" => url}, _known_users_map) do
    url
  end

  defp apply_styles(text, %{"bold" => true}), do: "**" <> text <> "**"
  defp apply_styles(text, %{"italic" => true}), do: "_" <> text <> "_"
  defp apply_styles(text, %{"strike" => true}), do: "~~" <> text <> "~~"
  defp apply_styles(text, %{"code" => true}), do: "`" <> text <> "`"
  defp apply_styles(text, _), do: text

  defp convert_list_item(
         %{"type" => "rich_text_section", "elements" => elements},
         known_users_map
       ) do
    elements
    |> Enum.map(&convert_sub_element(&1, known_users_map))
    |> Enum.join("")
    |> prepend_bullet()
  end

  defp prepend_bullet(text), do: "* " <> text

  defp wrap_in_code_block(text), do: "```\n" <> text <> "\n```"

  defp wrap_in_blockquote(text), do: "> " <> text

  defp slack_user_ids_to_mentions(known_slack_user_ids, text) do
    known_slack_user_ids
    |> Enum.reduce({text, []}, fn %Data.SlackAgentMapping{
                                    agent_id: agent_id,
                                    slack_user_id: slack_user_id
                                  },
                                  {text, mentions} ->
      agent = Repo.Agent.get(agent_id)

      {text |> String.replace("<@#{slack_user_id}>", "@#{agent.name}"),
       [%Api.Message.Mention{id: agent.id, text: agent.name} | mentions]}
    end)
  end
end
