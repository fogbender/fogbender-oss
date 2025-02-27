defmodule Fog.Repo.Integration do
  import Ecto.Query, only: [from: 2]
  alias Fog.{Data, Repo}

  def get(wid, id) when is_number(id),
    do:
      from(
        i in Data.WorkspaceIntegration,
        where: i.id == ^id,
        where: i.workspace_id == ^wid
      )
      |> Repo.one()

  def get(wid, id, f) when is_number(id) and is_atom(f) do
    from(i in Data.WorkspaceIntegration,
      select: field(i, ^f),
      where: i.id == ^id,
      where: i.workspace_id == ^wid
    )
    |> Repo.one()
  end

  def all(wid) do
    from(i in Data.WorkspaceIntegration,
      where: i.workspace_id == ^wid
    )
    |> Repo.all()
  end

  def get_by_project_id(wid, project_id) when is_binary(project_id) do
    from(i in Data.WorkspaceIntegration,
      where: i.project_id == ^project_id,
      where: i.workspace_id == ^wid
    )
    |> Repo.one()
  end

  def get_by_type_project_id(wid, type, project_id) when is_binary(project_id) do
    from(i in Data.WorkspaceIntegration,
      where: i.project_id == ^project_id,
      where: i.type == ^type,
      where: i.workspace_id == ^wid
    )
    |> Repo.one()
  end

  def get_by_type(wid, type) do
    from(i in Data.WorkspaceIntegration,
      where: i.type == ^type,
      where: i.workspace_id == ^wid
    )
    |> Repo.all()
  end

  def get_by_meta_type(wid, meta_type) do
    providers = Fog.Integration.by_meta_type(meta_type)

    from(i in Data.WorkspaceIntegration,
      where: i.type in ^providers,
      where: i.workspace_id == ^wid
    )
    |> Repo.all()
  end

  def issue_tag(integration, issue_id) do
    Repo.Tag.create(
      integration.workspace_id,
      ":#{integration.type}:#{integration.project_id}:#{issue_id}"
    )
  end

  def admin_issue_tag(integration, issue_id) do
    Repo.Tag.create(
      integration.workspace_id,
      ":#{integration.type}:#{integration.project_id}:#{issue_id}:admin"
    )
  end

  def add(
        %Data.Workspace{} = workspace,
        type,
        project_id,
        specifics,
        with_bot_agent \\ true,
        name_override \\ nil
      ) do
    %{avatar_url: avatar_url, name: name, module: module} = Fog.Integration.info(type)

    name =
      case not is_nil(name_override) do
        true ->
          name_override

        false ->
          name
      end

    integration =
      Data.WorkspaceIntegration.new(
        workspace_id: workspace.id,
        type: type,
        project_id: project_id,
        specifics: specifics
      )
      |> Repo.insert!(
        on_conflict: {:replace, [:specifics]},
        conflict_target: [:workspace_id, :project_id, :type]
      )

    if with_bot_agent do
      integration_tag = Repo.Tag.create(workspace.id, module.integration_tag_name(integration))
      app_tag = Repo.Tag.create(workspace.id, ":app")

      Repo.Tag.create(workspace.id, ":bug")
      Repo.Tag.create(workspace.id, ":feature")

      {:ok, _} =
        Repo.insert(
          %Data.Agent{
            email: integration_tag.name,
            name: name,
            image_url: avatar_url,
            is_bot: true
          },
          on_conflict: {:replace, [:name, :image_url]},
          conflict_target: :email,
          returning: true
        )

      bot_agent = Data.Agent |> Repo.get_by(email: integration_tag.name) |> Repo.preload(:tags)

      new_tags = [
        %{agent_id: bot_agent.id, tag_id: integration_tag.id},
        %{agent_id: bot_agent.id, tag_id: app_tag.id}
      ]

      old_tags =
        bot_agent.tags
        |> Enum.map(fn at ->
          %{agent_id: at.agent_id, tag_id: at.tag_id}
        end)

      tags = (old_tags ++ new_tags) |> Enum.uniq_by(& &1.tag_id)

      bot_agent =
        bot_agent
        |> Data.Agent.update(tags: tags)
        |> Repo.update!()

      {:ok, _} =
        Repo.insert(
          Fog.Data.VendorAgentRole.new(
            agent_id: bot_agent.id,
            vendor_id: workspace.vendor_id,
            role: "app"
          ),
          # XXX already a member
          on_conflict: :nothing
        )

      {:ok, integration, bot_agent}
    else
      {:ok, integration}
    end
  end

  def create_assistant(workspace, assistant_name, assistant_id) do
    avatar_url =
      "https://api.dicebear.com/9.x/bottts-neutral/svg?seed=#{Base.url_encode64(assistant_name, padding: false)}"

    integration_tag = Repo.Tag.create(workspace.id, assistant_id)

    {:ok, _} =
      Repo.insert(
        %Data.Agent{
          email: integration_tag.name,
          name: assistant_name,
          image_url: avatar_url,
          is_bot: true
        },
        on_conflict: {:replace, [:name, :image_url]},
        conflict_target: :email,
        returning: true
      )

    bot_agent = Data.Agent |> Repo.get_by(email: integration_tag.name) |> Repo.preload(:tags)

    new_tags = [
      %{agent_id: bot_agent.id, tag_id: integration_tag.id}
    ]

    old_tags =
      bot_agent.tags
      |> Enum.map(fn at ->
        %{agent_id: at.agent_id, tag_id: at.tag_id}
      end)

    tags = (old_tags ++ new_tags) |> Enum.uniq_by(& &1.tag_id)

    bot_agent =
      bot_agent
      |> Data.Agent.update(tags: tags)
      |> Repo.update!()

    {:ok, _} =
      Repo.insert(
        Fog.Data.VendorAgentRole.new(
          agent_id: bot_agent.id,
          vendor_id: workspace.vendor_id,
          role: "assistant"
        ),
        # XXX already a member
        on_conflict: :nothing
      )

    {:ok, bot_agent}
  end
end
