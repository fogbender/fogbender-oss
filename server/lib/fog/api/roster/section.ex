defmodule Fog.Api.Roster.Section do
  @moduledoc """
  ## Overview

  Sections are named predicates that checked one by one. Normally process is stopped on first valid section.

  ### Optional sections
  If section name prefixed with ? it allows go further and put item into two sections on the same time.
  E.g. we can put ALL and PINNED section as such an example:

  ?ALL
  ?PINNED
  ASSIGNED TO ME
  ASSIGNED
  *OPEN

  ### "Other" section

  If section name prefixed with * it's used as "other" section so it will contain all rooms that didn't get
  into any non-optional section. It's could have any name, as predicate will not be used for it.

  ### Virtual sections

  Virtual sections generated on the fly from room's data.

  "CUSTOMER" - it will use room's customer name as section name
  "TAG:<type>" - it will use tag of type <type> names as section name if room has such a tag

  Virtual sections use entity id prefixed with section type as it's id and could provide additional
  information in entityType/entity fields.

  %Event.RosterSection{
    name: "Ditto",
    id: "CUSTOMER:c12343234",
    entityType: "CUSTOMER"
    entity: %{
      id: "c12341234",
      name: "Ditto"
  }}

  %Event.RosterSection{
    name: ":priority:HIGH",
    id: "TAG:t1234343",
    entityType: "TAG",
    entity: %{id: "t1234123", name: ":priority:HIGH", ...}
  }
  """
  alias Fog.Repo
  alias Fog.Api.{Event, Session, Roster}

  @type section :: %Event.RosterSection{}
  @type section_name() :: String.t()

  @sections [
    "ALL",
    "ARCHIVED",
    "PINNED",
    "ASSIGNED TO ME",
    "ASSIGNED",
    "DIRECT",
    "OPEN",
    "PRIVATE",
    "INBOX",
    "OTHER",
    "NEW",
    "NEW VISITOR",
    "CUSTOMER",
    "TAG:",
    "CLOSED"
  ]

  @unfiltered_sections [
    "PINNED"
  ]

  @default_agent [
    "CLOSED",
    "ARCHIVED",
    "NEW",
    "NEW VISITOR",
    "?PINNED",
    "ASSIGNED TO ME",
    "ASSIGNED",
    "DIRECT",
    "*OPEN"
  ]

  @default_user [
    "CLOSED",
    "ARCHIVED",
    "?PINNED",
    "DIRECT",
    "PRIVATE",
    "*INBOX"
  ]

  defmodule Params do
    defstruct [
      :event,
      :parsed_tags,
      :actor_id,
      :groups
    ]

    def from_event(%Event.RosterRoom{room: r} = event, session) do
      %__MODULE__{
        event: event,
        actor_id: Session.actor_id(session),
        parsed_tags: Enum.map(r.tags, &{&1, Repo.Tag.parse(&1.name)}),
        groups: groups(session)
      }
    end

    defp groups(%Session.Agent{groups: groups}), do: groups
    defp groups(_), do: []
  end

  def new(nil, session), do: new(default(session), session)

  def new(sections, _session) do
    case names(sections) -- @sections do
      [] ->
        {:ok, sections}

      rest ->
        {:error, "Unknown sections: #{inspect(rest)}"}
    end
  end

  def default(%Session.Agent{}), do: @default_agent
  def default(%Session.User{}), do: @default_user

  @spec from_event(%Event.RosterRoom{}, [section_name()], Roster.Filter.t(), Roster.session()) ::
          [section()]
  def from_event(%Event.RosterRoom{} = event, sections, filter, session) do
    params = Params.from_event(event, session)
    process(sections, filter, params)
  end

  defp process([], _filter, _params), do: []

  defp process(["*" <> section | _], filter, params) do
    if apply_filter(section, filter, params) do
      case params do
        %Params{
          event: %Event.RosterRoom{
            room: %Event.Room{type: type, customerName: "$Cust_External_" <> _}
          }
        }
        when type not in ["private"] ->
          []

        _ ->
          [%Event.RosterSection{id: section, name: section}]
      end
    else
      []
    end
  end

  defp process(["?" <> section | rest], filter, params) do
    sections = get_sections(section, filter, params)
    sections ++ process(rest, filter, params)
  end

  defp process([section | rest], filter, params) do
    case get_sections(section, filter, params) do
      [] -> process(rest, filter, params)
      sections -> sections
    end
  end

  defp get_sections(section, filter, params) do
    if apply_filter(section, filter, params) do
      case section(section, params) do
        false -> []
        true -> [%Event.RosterSection{id: section, name: section}]
        %Event.RosterSection{} = section -> [section]
        sections when is_list(sections) -> sections
      end
    else
      []
    end
  end

  defp apply_filter(section, filter, params) do
    section in @unfiltered_sections or
      Roster.Filter.from_event(params.event, filter)
  end

  defp section("ALL", _), do: true
  defp section("OTHER", _), do: true

  defp section("OPEN", %Params{event: %Event.RosterRoom{room: %Event.Room{status: status}}}),
    do: status == "active"

  defp section("ARCHIVED", %Params{event: %Event.RosterRoom{room: %Event.Room{status: status}}}),
    do: status == "archived"

  defp section("PINNED", %Params{actor_id: actor_id, parsed_tags: tags}),
    do: has_tag({:personal, actor_id, ["pin"]}, tags)

  defp section("ASSIGNED TO ME", %Params{parsed_tags: tags, actor_id: actor_id, groups: groups}) do
    [
      {:system, "assignee", [actor_id]}
      | Enum.map(groups, &{:system, "assignee", ["group", &1.group]})
    ]
    |> Enum.any?(&has_tag(&1, tags))
  end

  defp section("ASSIGNED", %Params{parsed_tags: tags}),
    do:
      Enum.any?(tags, fn
        {_, {:system, "assignee", _}} -> true
        _ -> false
      end)

  defp section("CLOSED", %Params{parsed_tags: tags}) do
    Enum.any?(tags, fn
      {_, {:system, "status", ["closed"]}} -> true
      _ -> false
    end)
  end

  defp section("PRIVATE", %Params{event: %Event.RosterRoom{room: room}}),
    do: room.type in ["private", "dialog"]

  defp section("DIRECT", %Params{event: %Event.RosterRoom{room: room}}), do: room.type == "dialog"

  defp section("NEW", %Params{event: %Event.RosterRoom{room: room, badge: nil}}),
    do: not room.resolved and room.type == "public"

  defp section("NEW VISITOR", %Params{event: %Event.RosterRoom{room: room, badge: nil}}),
    do: not room.resolved and room.type == "private" and room.customerType == "visitor"

  defp section("CUSTOMER", %Params{event: %Event.RosterRoom{room: room}}),
    do: %Event.RosterSection{
      id: "CUSTOMER:#{room.customerId}",
      name: Repo.Helpdesk.printable_customer_name(room.customerName),
      entityType: "CUSTOMER",
      entity: %{
        id: room.customerId,
        name: Repo.Helpdesk.printable_customer_name(room.customerName)
      }
    }

  defp section("TAG:" <> tag, %Params{parsed_tags: tags}) do
    case tag |> String.split(":") do
      [type] ->
        for {tag, {:system, ^type, _}} <- tags do
          %Event.RosterSection{
            id: "TAG" <> ":" <> tag.id,
            name: tag.name,
            entityType: "TAG",
            entity: tag
          }
        end

      [type | rest] ->
        for {tag, {:system, ^type, ^rest}} <- tags do
          %Event.RosterSection{
            id: "TAG" <> ":" <> tag.id,
            name: tag.name,
            entityType: "TAG",
            entity: tag
          }
        end
    end
  end

  defp section(_, _), do: false

  defp has_tag(tag, parsed_tags) do
    Enum.any?(parsed_tags, fn
      {_, ^tag} -> true
      _ -> false
    end)
  end

  defp names(sections) do
    Enum.map(sections, &parse_section_name/1)
  end

  defp parse_section_name("?" <> name), do: parse_section_name(name)
  defp parse_section_name("*" <> _), do: "ALL"
  defp parse_section_name("TAG:" <> _), do: "TAG:"
  defp parse_section_name(name), do: name
end
