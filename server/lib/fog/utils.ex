defmodule Fog.Utils do
  import Ecto.Query

  require Logger

  alias Fog.{Api, Data, Repo}

  def time_us do
    {megs, sec, usec} = :os.timestamp()
    megs * 1_000_000_000_000 + sec * 1_000_000 + usec
  end

  def maps_to_csv(maps, fields) do
    data =
      maps
      |> Stream.map(&Fog.Map.select(&1, fields, ""))

    Stream.concat([fields], data)
    |> CSV.encode()
  end

  def to_unix(%DateTime{} = t), do: t |> DateTime.to_unix(:microsecond)
  def from_unix(us) when is_integer(us), do: us |> DateTime.from_unix!(:microsecond)

  def changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
    |> Enum.into([])
  end

  def escape_mime(type) do
    case MIME.extensions(type) do
      [] ->
        "application/octet-stream"

      _ ->
        type
    end
  end

  def internal_hid(wid) do
    from(
      h in Data.Helpdesk,
      join: c in assoc(h, :customer),
      on: like(c.name, "$Cust_Internal_%"),
      where: h.workspace_id == ^wid,
      select: h.id
    )
    |> Repo.one()
    |> Fog.Types.HelpdeskId.dump()
    |> elem(1)
  end

  def coalesce([]), do: nil
  def coalesce([nil | xs]), do: coalesce(xs)
  def coalesce([x | _]), do: x

  def coalesce(nil, y), do: y
  def coalesce(x, _), do: x
  def coalesce(nil, nil, z), do: z
  def coalesce(nil, y, _), do: y
  def coalesce(x, _, _), do: x

  def add_tags_to_author(author, tag_ids_to_add) do
    author = author |> Fog.Repo.preload([:tags])
    author_tag_ids = author.tags |> Enum.map(& &1.tag_id)

    entries =
      tag_ids_to_add
      |> Enum.reject(&(&1 in author_tag_ids))
      |> Enum.map(fn tid ->
        case author do
          %Fog.Data.User{} ->
            Fog.Data.AuthorTag.new(user_id: author.id, tag_id: tid)

          %Fog.Data.Agent{} ->
            Fog.Data.AuthorTag.new(agent_id: author.id, tag_id: tid)
        end
      end)

    {:ok, author_tags} =
      Fog.Repo.transaction(fn ->
        Enum.map(entries, &Fog.Repo.insert!(&1))
      end)

    author_tags |> Enum.each(&(:ok = Fog.Api.Event.Tag.publish(&1)))

    :ok
  end

  def optional_encode(required, optional, value, opts) do
    optional = optional |> Enum.filter(&Ecto.assoc_loaded?(Map.get(value, &1)))

    Jason.Encode.map(
      Map.take(value, required ++ optional),
      opts
    )
  end

  def to_search_pattern(value) do
    value =
      value
      |> normalize_value()
      |> escape_psql_like_pattern()

    "%#{value}%"
  end

  def normalize_value(value) do
    if value != nil do
      value |> String.downcase() |> String.split() |> Enum.join("")
    end
  end

  @doc """
  Escape plaintext value so it is safe to use with PSQL LIKE expression

  https://github.com/Sameday-Health/same_day_phoenix/pull/402#discussion_r706703051 and https://dba.stackexchange.com/a/261413/238543
  """
  def escape_psql_like_pattern(string) do
    string
    |> String.replace("\\", ~S(\\))
    |> String.replace("%", ~S(\%))
    |> String.replace("_", ~S(\_))
  end

  def get_author(%Data.Message{from_agent_id: agent_id, from_user_id: user_id}) do
    if user_id do
      Repo.User.get(user_id)
    else
      Repo.Agent.get(agent_id)
    end
  end

  def get_author(sess) do
    user_id = Api.Message.author(:user, sess)
    agent_id = Api.Message.author(:agent, sess)

    if user_id do
      Repo.User.get(user_id)
    else
      Repo.Agent.get(agent_id)
    end
  end

  def get_author_with_overrides(message, sess) do
    user_id = Api.Message.author(:user, sess)
    agent_id = Api.Message.author(:agent, sess)

    with_overrides = fn
      %Data.Agent{} = agent ->
        case message.from_name_override do
          nil ->
            agent

          from_name_override ->
            %{
              agent
              | from_name_override: from_name_override,
                from_image_url_override: message.from_image_url_override
            }
        end

      user ->
        user
    end

    if user_id do
      Repo.User.get(user_id)
    else
      Repo.Agent.get(agent_id)
    end
    |> with_overrides.()
  end

  def author_name(%Data.User{} = author), do: author.name
  def author_name(%Data.Agent{} = author), do: author.from_name_override || author.name

  def room_url(vendor_id, workspace_id, room_id) do
    "#{Fog.env(:fog_storefront_url)}/admin/vendor/#{vendor_id}/workspace/#{workspace_id}/chat/#{room_id}"
  end

  def message_url(vendor_id, workspace_id, room_id, message_id) do
    "#{Fog.env(:fog_storefront_url)}/admin/vendor/#{vendor_id}/workspace/#{workspace_id}/chat/#{room_id}/#{message_id}"
  end

  def safe_text_to_issue_title(text, maxWords \\ 8) do
    case text_to_issue_title(text, maxWords) do
      {:error, _} ->
        text

      response ->
        response
    end
  end

  def text_to_issue_title(text, maxWords \\ 8) do
    prompt = """
      Summarize the following text in a most #{maxWords} words. If it's a question, avoid answering, just summarize the question.

      Text: \"\"\"
      #{text}
      \"\"\"
    """

    case Fog.Ai.ask_ai(prompt, 1) do
      {:response, response} ->
        [response |> String.trim_trailing(".")]

      e ->
        Logger.error("Error: #{inspect(e)} #{Exception.format_stacktrace()}")
        {:error, "Could not summarize"}
    end
  end

  @doc """
  Returns existing atom if it exists, otherwise returns the value as is.
  """
  def maybe_atom(value) when is_binary(value) do
    try do
      String.to_existing_atom(value)
    rescue
      ArgumentError ->
        value
    end
  end

  def create_test_agents(wid, n \\ 10) do
    w = Fog.Repo.Workspace.get(wid) |> Fog.Repo.preload(:vendor)

    for _x <- 1..n do
      id = Snowflake.next_id() |> elem(1)

      Data.Agent.new(
        id: id,
        name: "agent #{id}",
        email: "agent#{id}@example.com",
        vendors: [%{agent_id: id, vendor_id: w.vendor_id, role: "admin"}],
        workspaces: [%{agent_id: id, workspace_id: w.id, role: "admin"}],
        groups: [%{agent_id: id, vendor_id: w.vendor_id, group: "all"}]
      )
      |> Repo.insert!()
    end
  end
end
