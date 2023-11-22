defmodule Fog.Api.Event.Room do
  import Ecto.Query, only: [from: 2]
  import Fog.Repo, only: [sql_split_part: 3]

  alias Fog.{Integration, Repo, Data, PubSub, Utils, Api.Event}
  alias Fog.Repo.Query
  alias Fog.Api.Session
  alias Fog.Api.Event.Room

  use Fog.StructAccess

  defstruct [
    :msgType,
    :msgId,
    :id,
    :createdTs,
    :updatedTs,
    :vendorId,
    :workspaceId,
    :helpdeskId,
    :customerId,
    :customerName,
    :customerType,
    :customerDeletedTs,
    :name,
    :displayNameForUser,
    :displayNameForAgent,
    :email,
    :agentId,
    :userId,
    :imageUrl,
    :members,
    :tags,
    :status,
    :created,
    :type,
    :remove,
    :isTriage,
    :resolved,
    :resolvedAt,
    :resolvedTil,
    :resolvedByAgentId,
    :lastMessage,
    :relevantMessage,
    :createdBy,
    :commands,
    :defaultGroupAssignment
  ]

  @type t() :: %__MODULE__{}

  def preload(q) do
    Repo.preload(q, [
      :customer,
      :created_by_agent,
      :created_by_user,
      workspace: workspace_with_feature_options_query(),
      members: [:agent, :user],
      tags: [tag: tag_integration_query()],
      last_message: [
        :helpdesk,
        :workspace,
        :from_user,
        :from_agent,
        :deleted_by_agent,
        :deleted_by_user
      ],
      relevant_message: [
        :helpdesk,
        :workspace,
        :from_user,
        :from_agent,
        :deleted_by_agent,
        :deleted_by_user
      ]
    ])
  end

  defp workspace_with_feature_options_query() do
    from(w in Data.Workspace,
      left_join: fo in subquery(Data.FeatureOption.for_workspace()),
      on: fo.workspace_id == w.id,
      select: w,
      select_merge: %{feature_options: fo}
    )
  end

  def tag_integration_query() do
    from(t in Data.Tag,
      left_join: integration in Data.WorkspaceIntegration,
      on:
        integration.workspace_id == t.workspace_id and
          sql_split_part(t.name, ":", 2) in ^Integration.providers() and
          sql_split_part(t.name, ":", 2) == integration.type and
          sql_split_part(t.name, ":", 3) == integration.project_id,
      left_join: issue in Data.IntegrationIssue,
      on:
        issue.workspace_id == integration.workspace_id and
          issue.type == integration.type and
          issue.project_id == integration.project_id and
          sql_split_part(t.name, ":", 4) != "" and
          issue.issue_id == sql_split_part(t.name, ":", 4),
      select: t,
      select_merge: %{
        integration: integration,
        integration_issue: issue
      }
    )
  end

  defp my_rooms(query, %Session.Agent{agentId: aid}) do
    from(
      r in query,
      left_join: m in assoc(r, :members),
      on: m.agent_id == ^aid,
      left_join: ag in Data.VendorAgentGroup,
      on: ag.agent_id == ^aid,
      where: r.type == "public" or not is_nil(m.room_id) or ag.group in r.agent_groups
    )
  end

  defp my_rooms(query, %Session.User{userId: uid}) do
    from(
      r in query,
      left_join: m in assoc(r, :members),
      on: m.user_id == ^uid,
      where: r.type == "public" or not is_nil(m.room_id)
    )
  end

  defp tagged_rooms(query, %Session.Agent{}) do
    query
  end

  defp tagged_rooms(query, %Session.User{userId: uid}) do
    user = Fog.Repo.User.get(uid) |> Fog.Repo.preload(workspace: :feature_flags)
    workspace_feature_flags = Enum.map(user.workspace.feature_flags, & &1.feature_flag_id)
    case_tag = Fog.Repo.get_by(Data.Tag, name: "Case", workspace_id: user.workspace.id)

    case_tag_id =
      case case_tag do
        %Data.Tag{id: id} -> id
        _ -> nil
      end

    case "User Tag Scoping" in workspace_feature_flags do
      true ->
        from(
          r in query,
          left_join: r0 in subquery(cases(query, case_tag_id)),
          on: r.id == r0.id,
          where: is_nil(r0.id),
          left_join: rt in assoc(r, :tags),
          left_join: u in Data.User,
          on: u.id == ^uid,
          left_join: ut in assoc(u, :tags),
          where: r.type == "private" or (rt.tag_id == ut.tag_id or is_nil(rt))
        )

      false ->
        query
    end
  end

  defp cases(query, case_tag_id) do
    from(
      r in query,
      join: rt in assoc(r, :tags),
      on: rt.tag_id == ^case_tag_id
    )
  end

  def load_inserted(ctx, opts, sess) do
    Data.Room
    |> Query.with_ctx(ctx)
    |> my_rooms(sess)
    |> tagged_rooms(sess)
    |> Query.inserted(opts)
    |> Repo.Room.with_last_message()
    |> Repo.all()
    |> preload()
    |> Enum.map(&from_data(&1, opts))
  end

  def load_updated(ctx, opts, sess) do
    Data.Room
    |> Query.with_ctx(ctx)
    |> my_rooms(sess)
    |> tagged_rooms(sess)
    |> Query.updated(opts)
    |> Repo.Room.with_last_message()
    |> Repo.all()
    |> preload()
    |> Enum.map(&from_data/1)
  end

  def load_for_room(room_id) do
    from(r in Data.Room, where: r.id == ^room_id)
    |> Repo.Room.with_last_message()
    |> Repo.all()
    |> preload()
    |> Enum.map(&from_data/1)
  end

  def publish(%Data.Room{id: room_id}) do
    [e] = load_for_room(room_id)
    for t <- topics(e), do: PubSub.publish(t, e)
    :ok = Fog.Notify.Badge.schedule(e)
  end

  def publish(%Data.Message{room_id: room_id}) do
    [e] = load_for_room(room_id)
    for t <- topics(e), do: PubSub.publish(t, e)
  end

  defp topics(%Event.Room{} = e) do
    [
      "vendor/#{e.vendorId}/rooms",
      "helpdesk/#{e.helpdeskId}/rooms",
      "workspace/#{e.workspaceId}/rooms"
    ]
  end

  def from_data(%Data.Room{} = r, opts \\ %{}) do
    created =
      case r.created do
        c when is_boolean(c) ->
          c

        _ ->
          true
      end

    to_message_opts =
      case opts do
        %{without_parsing: true} ->
          [without_parsing: true]

        _ ->
          []
      end

    %Room{
      id: r.id || Fog.Types.RoomId.generate(),
      created: created,
      updatedTs: (r.updated_at || DateTime.utc_now()) |> Utils.to_unix(),
      createdTs: (r.inserted_at || DateTime.utc_now()) |> Utils.to_unix(),
      vendorId: r.workspace.vendor_id,
      workspaceId: r.workspace.id,
      helpdeskId: r.helpdesk_id,
      customerId: r.customer.id,
      customerName: r.customer.name,
      customerType: Repo.Helpdesk.customer_type(r.customer),
      customerDeletedTs: deleted_at(r.customer.deleted_at),
      name: r.name,
      displayNameForUser: r.display_name_for_user,
      displayNameForAgent: r.display_name_for_agent,
      # when searching, created == false for users/agents (search template)
      imageUrl: r.image_url,
      # search template:
      email: r.email,
      # search template:
      agentId: r.agent_id,
      # search template:
      userId: r.user_id,
      status: r.status,
      type: r.type,
      isTriage: r.is_triage,
      members:
        case r.members do
          members when is_list(members) ->
            for m <- members, do: member(m)

          _ ->
            nil
        end,
      tags:
        case r.tags do
          tags when is_list(tags) ->
            for t <- tags, do: tag(t.tag)

          _ ->
            nil
        end,
      resolved: to_resolved(r),
      resolvedAt: r.resolved_at && Utils.to_unix(r.resolved_at),
      resolvedTil: r.resolved_til && Utils.to_unix(r.resolved_til),
      resolvedByAgentId: r.resolved_by_agent_id,
      lastMessage: to_message(r.last_message, to_message_opts),
      relevantMessage: to_message(r.relevant_message, to_message_opts),
      createdBy: to_created_by(r),
      commands: r.commands,
      defaultGroupAssignment: r.workspace.feature_options.default_group_assignment
    }
  end

  defp to_message(nil, _), do: nil
  defp to_message(%Data.Message{} = m, opts), do: Event.Message.from_data(m, opts)

  defp to_resolved(%Data.Room{
         resolved: resolved,
         resolved_at: resolved_at,
         last_message: lm,
         helpdesk: helpdesk,
         type: type,
         agent_groups: agent_groups
       })
       when type === "public" or length(agent_groups) > 0 do
    Repo.Helpdesk.internal?(helpdesk) or
      (!!resolved and
         (is_nil(lm) or
            DateTime.compare(resolved_at, lm.inserted_at) == :gt or
            not is_nil(lm.from_agent_id)))
  end

  defp to_resolved(_),
    do: true

  defp to_created_by(%Data.Room{created_by_agent: agent}) when not is_nil(agent) do
    %{
      id: agent.id,
      type: "agent",
      imageUrl: agent.image_url,
      name: agent.name,
      email: agent.email
    }
  end

  defp to_created_by(%Data.Room{created_by_user: user}) when not is_nil(user) do
    %{
      id: user.id,
      type: "user",
      imageUrl: user.image_url,
      name: user.name,
      email: user.email
    }
  end

  defp to_created_by(_), do: nil

  defp deleted_at(nil), do: nil
  defp deleted_at(deleted_at), do: deleted_at |> Utils.to_unix()

  def remove(%Room{} = r) do
    %Room{r | remove: true, name: nil, members: []}
  end

  def tag(%Data.RoomTag{tag: t}) do
    tag(t)
  end

  def tag(%Data.Tag{name: ":gitlab:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":github:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":asana:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":linear:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":jira:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":height:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":trello:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":slack:" <> _} = t), do: integration_tag(t)
  def tag(%Data.Tag{name: ":msteams:" <> _} = t), do: integration_tag(t)

  def tag(%Data.Tag{name: name} = t) when name in [":open", ":closed"] do
    %{
      id: t.id,
      name: t.name,
      workspace_id: t.workspace_id,
      meta_type: "status"
    }
  end

  def tag(%Data.Tag{} = t) do
    bare_tag(t)
  end

  defp integration_tag(%Data.Tag{} = t), do: integration_tag(tl(Regex.split(~r{:}, t.name)), t)

  defp integration_tag([_integration_type, _project_id], t) do
    case t.integration do
      %Data.WorkspaceIntegration{type: type} = integration ->
        meta_type = Integration.info(type).meta_type

        %{
          id: t.id,
          name: t.name,
          workspace_id: t.workspace_id,
          meta_type: meta_type,
          meta_entity_type: type,
          meta_entity_url: Integration.url(integration),
          meta_entity_name: Integration.name(integration)
        }

      nil ->
        bare_tag(t)
    end
  end

  defp integration_tag(
         [integration_type, _project_id, _issue_id],
         %Data.Tag{integration_issue: %Data.IntegrationIssue{} = i} = t
       ) do
    %{
      id: t.id,
      name: t.name,
      workspace_id: t.workspace_id,
      meta_type: "issue",
      meta_state: i.state,
      meta_entity_type: integration_type,
      meta_entity_url: i.url,
      meta_entity_name: i.name,
      meta_entity_id: i.issue_id,
      meta_entity_parent_id: i.project_id
    }
  end

  defp integration_tag(_, t) do
    bare_tag(t)
  end

  defp bare_tag(%Data.Tag{} = t) do
    %{
      id: t.id,
      name: t.name,
      workspace_id: t.workspace_id
    }
  end

  defp member(%Data.RoomMembership{agent: m}) when not is_nil(m) do
    member("agent", m)
  end

  defp member(%Data.RoomMembership{user: m}) when not is_nil(m) do
    member("user", m)
  end

  defp member(type, m) do
    %{
      type: type,
      id: m.id,
      name: m.name,
      email: m.email,
      imageUrl: m.image_url
    }
  end
end
