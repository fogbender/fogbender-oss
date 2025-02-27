defmodule Fog.Api.Author do
  use Fog.Api.Handler
  alias Fog.Api.{Session}
  alias Fog.{Repo, Data}

  defmsg(GetSettings, [:workspaceId])

  defmsg(UpdateSettings, [
    :period,
    :enabled
  ])

  @commands [GetSettings, UpdateSettings]

  defmsg(Ok, [:settings])
  deferr(Err, [])

  def info(c, s), do: info(c, s, [])

  def info(%command{} = m, s, _) when command in @commands do
    case handle_command(m, s) do
      %Data.FeatureOption{} = res ->
        {:reply, %Ok{settings: res}}

      _ ->
        {:reply, Err.forbidden()}
    end
  end

  def info(_, _, _), do: :skip

  defp handle_command(
         %UpdateSettings{period: period, enabled: enabled},
         sess
       ) do
    author = author(sess)

    if author do
      # TODO: make it possible to set feature options per workspace / vendor :TODO
      Repo.FeatureOption.set(author,
        email_digest_period: period,
        email_digest_enabled: enabled
      )
    else
      nil
    end
  end

  defp handle_command(%GetSettings{workspaceId: wid}, sess) do
    author = author(sess)

    case author do
      %Data.Agent{} = agent ->
        %{vendorId: vid} = sess
        vendor = Repo.Vendor.get(vid)
        workspace = Repo.Workspace.get(wid)
        Repo.FeatureOption.get(vendor, workspace, agent)

      %Data.User{} = user ->
        Repo.FeatureOption.get(user)

      _ ->
        nil
    end
  end

  defp author(%Session.User{userId: user_id}), do: Repo.User.get(user_id)
  defp author(%Session.Agent{agentId: agent_id}), do: Repo.Agent.get(agent_id)
  defp author(_), do: nil
end
