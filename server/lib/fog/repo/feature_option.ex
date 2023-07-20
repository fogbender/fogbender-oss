defmodule Fog.Repo.FeatureOption do
  alias Fog.{Repo, Data}

  @global_vendor %Data.Vendor{id: Data.FeatureOption.global_vendor_id()}
  @global_agent %Data.Agent{id: Data.FeatureOption.global_agent_id()}
  @global_user %Data.User{id: Data.FeatureOption.global_user_id()}

  def vendor_defaults(options), do: set(@global_vendor, options)
  def agent_defaults(options), do: set(@global_agent, options)
  def user_defaults(options), do: set(@global_user, options)

  def vendor_defaults(), do: find(@global_vendor)
  def agent_defaults(), do: find(@global_agent)
  def user_defaults(), do: find(@global_user)

  def find(ctx) do
    Repo.get_by(Data.FeatureOption, [{ctx_field(ctx), ctx.id}])
  end

  def set(ctx, options) do
    case find(ctx) do
      nil -> %Data.FeatureOption{} |> struct([{ctx_field(ctx), ctx.id}])
      rec -> rec
    end
    |> Data.FeatureOption.update(options)
    |> Repo.insert_or_update()
    |> to_error()
  end

  def get(%Data.User{id: id}), do: Data.FeatureOption.for_user() |> Repo.get_by(user_id: id)

  def get(%Data.Workspace{id: id}),
    do: Data.FeatureOption.for_workspace() |> Repo.get_by(workspace_id: id)

  def get(%Data.Vendor{id: id}), do: Data.FeatureOption.for_vendor() |> Repo.get_by(vendor_id: id)

  def get(%Data.Vendor{id: vid}, %Data.Workspace{id: wid}, %Data.Agent{id: aid}) do
    Data.FeatureOption.for_vendor_agent()
    |> Repo.get_by(vendor_id: vid, workspace_id: wid, agent_id: aid)
  end

  defp ctx_field(%Data.User{}), do: :user_id
  defp ctx_field(%Data.Agent{}), do: :agent_id
  defp ctx_field(%Data.Workspace{}), do: :workspace_id
  defp ctx_field(%Data.Vendor{}), do: :vendor_id

  defp to_error({:ok, _}), do: :ok
  defp to_error({:error, _} = error), do: error
end
