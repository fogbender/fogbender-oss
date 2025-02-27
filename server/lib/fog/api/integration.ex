defmodule Fog.Api.Integration do
  @moduledoc """
  """
  use Fog.Api.Handler
  alias Fog.{Api, Data, Repo}
  alias Fog.Api.Perm

  defmsg(CreateIssue, [
    :workspaceId,
    :integrationProjectId,
    :title,
    :roomId,
    :body
  ])

  defmsg(CreateIssueWithForward, [
    :workspaceId,
    :integrationProjectId,
    :title,
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId,
    :body
  ])

  defmsg(ForwardToIssue, [
    :workspaceId,
    :integrationProjectId,
    :issueId,
    :issueTitle,
    :linkRoomId,
    :linkStartMessageId,
    :linkEndMessageId
  ])

  defmsg(LabelIssue, [
    :workspaceId,
    :integrationProjectId,
    :issueId
  ])

  defmsg(IssueInfo, [
    :workspaceId,
    :integrationProjectId,
    :issueId
  ])

  defmsg(CloseIssue, [
    :workspaceId,
    :integrationProjectId,
    :issueId,
    :roomId
  ])

  defmsg(ReopenIssue, [
    :workspaceId,
    :integrationProjectId,
    :issueId,
    :roomId
  ])

  @commands [CreateIssue, CreateIssueWithForward, ForwardToIssue, LabelIssue, CloseIssue]

  defmsg(Ok, [:issueId, :issueTag, :issue])
  deferr(Err)

  def info(c, s), do: info(c, s, [])

  def info(%LabelIssue{} = m, s, p) do
    if Perm.Integration.allowed?(s, :label_issue, workspace_id: m.workspaceId) do
      handle_command(m, s, p)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(%IssueInfo{} = m, s, p) do
    if Perm.Integration.allowed?(s, :issue_info, workspace_id: m.workspaceId) do
      handle_command(m, s, p)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(%CloseIssue{} = m, s, p) do
    if Perm.Integration.allowed?(s, :close_issue, workspace_id: m.workspaceId) do
      handle_command(m, s, p)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(%ReopenIssue{} = m, s, p) do
    if Perm.Integration.allowed?(s, :reopen_issue, workspace_id: m.workspaceId) do
      handle_command(m, s, p)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(%command{} = m, s, p) when command in @commands do
    room_id =
      case m do
        %{roomId: room_id} ->
          room_id

        %{linkRoomId: room_id} ->
          room_id
      end

    if Perm.Integration.allowed?(s, :create_issue,
         workspace_id: m.workspaceId,
         room_id: room_id
       ) do
      handle_command(m, s, p)
    else
      {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp handle_command(
         %CreateIssue{workspaceId: wid, integrationProjectId: pid, roomId: rid} = command,
         sess,
         pipeline
       ) do
    integration = Repo.Integration.get_by_project_id(wid, pid)

    with {:ok, issue} = Fog.Integration.create_issue(command),
         issue_id = Fog.Issue.id_from_create_data(integration.type, issue) do
      maybe_update_room_tag(rid, integration, issue_id, sess, pipeline)
    end
  end

  defp handle_command(
         %CreateIssueWithForward{workspaceId: wid, integrationProjectId: pid} = command,
         sess,
         pipeline
       ) do
    internal_hid = Repo.Helpdesk.get_internal(wid).id
    integration = Repo.Integration.get_by_project_id(wid, pid)

    create_cmd = %Api.Room.Create{
      helpdeskId: internal_hid,
      name: command.title,
      linkRoomId: command.linkRoomId,
      linkStartMessageId: command.linkStartMessageId,
      linkEndMessageId: command.linkEndMessageId
    }

    with {:reply, %Api.Room.Ok{roomId: rid}} <- Api.Room.info(create_cmd, sess, pipeline),
         {:ok, issue} = Fog.Integration.create_issue(command),
         issue_id = Fog.Issue.id_from_create_data(integration.type, issue) do
      maybe_update_room_tag(rid, integration, issue_id, sess, pipeline)
    end
  end

  defp handle_command(
         %ForwardToIssue{workspaceId: wid, integrationProjectId: pid} = command,
         sess,
         pipeline
       ) do
    internal_hid = Repo.Helpdesk.get_internal(wid).id
    integration = Repo.Integration.get_by_project_id(wid, pid)

    create_cmd = %Api.Room.Create{
      helpdeskId: internal_hid,
      name: command.issueTitle,
      linkRoomId: command.linkRoomId,
      linkStartMessageId: command.linkStartMessageId,
      linkEndMessageId: command.linkEndMessageId
    }

    {:ok, rid} =
      try do
        {:reply, %Api.Room.Ok{roomId: rid}} = Api.Room.info(create_cmd, sess, pipeline)
        {:ok, rid}
      rescue
        _ ->
          room = Repo.get_by(Data.Room, helpdesk_id: internal_hid, name: command.issueTitle)

          source_room = Repo.Room.get(command.linkRoomId)

          message_create_command = %Api.Message.Create{
            roomId: room.id,
            text: "Forwarded from #{source_room.name}",
            linkRoomId: command.linkRoomId,
            linkStartMessageId: command.linkStartMessageId,
            linkEndMessageId: command.linkEndMessageId,
            linkType: "forward"
          }

          {:reply, %Api.Message.Ok{messageId: _}} = Api.Message.info(message_create_command, sess)

          {:ok, room.id}
      end

    case Fog.Integration.forward_to_issue(command) do
      {:ok, %{issueId: issue_id}} ->
        {:reply, %Ok{issueTag: issue_tag}} =
          maybe_update_room_tag(rid, integration, issue_id, sess, pipeline)

        {:reply, %Ok{issueId: issue_id, issueTag: issue_tag}}

      {:ok, _} ->
        {:reply, %Ok{}}
    end
  end

  defp handle_command(%LabelIssue{} = command, _, _) do
    case Fog.Integration.label_issue(command) do
      {:ok, %{issueId: issue_id}} -> {:reply, %Ok{issueId: issue_id}}
      {:ok, _} -> {:reply, %Ok{}}
    end
  end

  defp handle_command(%IssueInfo{integrationProjectId: project_id} = command, sess, _) do
    case Fog.Integration.handle(command, sess) do
      {:ok, issue} -> {:reply, %Ok{issue: Map.merge(issue, %{integrationProjectId: project_id})}}
    end
  end

  defp handle_command(%CloseIssue{} = command, sess, _) do
    case Fog.Integration.handle(command, sess) do
      {:ok, issue} -> {:reply, %Ok{issue: issue}}
    end
  end

  defp handle_command(%ReopenIssue{} = command, sess, _) do
    case Fog.Integration.handle(command, sess) do
      {:ok, issue} -> {:reply, %Ok{issue: issue}}
    end
  end

  defp maybe_update_room_tag(rid, integration, {:ok, issue_id}, sess, pipeline) do
    wid = integration.workspace_id
    internal_hid = Fog.Repo.Helpdesk.get_internal(wid).id
    room = Repo.Room.get(rid)
    issue_tag = Repo.Integration.issue_tag(integration, issue_id)
    admin_tag = Repo.Integration.admin_issue_tag(integration, issue_id)

    tags =
      case room.helpdesk_id do
        ^internal_hid ->
          [issue_tag.id, admin_tag.id]

        _ ->
          [issue_tag.id]
      end

    update_cmd = %Api.Room.Update{
      roomId: rid,
      tagsToAdd: tags,
      tagsToRemove: []
    }

    with {:reply, %Api.Room.Ok{}} <- Api.Room.info(update_cmd, sess, pipeline) do
      {:reply, %Ok{issueId: issue_id, issueTag: issue_tag.name}}
    end
  end

  defp maybe_update_room_tag(_, _, _, sess, _), do: {:reply, %Ok{}, sess}
end
