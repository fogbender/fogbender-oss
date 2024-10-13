defmodule Fog.Comms.Utils do
  # require Logger

  def to_fog_reaction(reaction) do
    reaction =
      case reaction do
        "surprised" -> "open_mouth"
        "like" -> "+1"
        "sad" -> "disappointed"
        "heart" -> {:symbol, "❤️"}
        "hearts" -> {:symbol, "❤️"}
        "fire" -> {:symbol, "🔥"}
        _ -> reaction
      end

    case reaction do
      {:symbol, symbol} ->
        symbol

      _ ->
        case Exmoji.find_by_short_name(reaction) do
          [variant | _] ->
            variant |> Exmoji.EmojiChar.render()

          _ ->
            reaction
        end
    end
  end
end
