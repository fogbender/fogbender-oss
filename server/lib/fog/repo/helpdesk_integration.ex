defmodule Fog.Repo.HelpdeskIntegration do
  import Ecto.Query, only: [from: 2]
  alias Fog.{Data, Repo}

  def get(hid, type),
    do:
      from(
        i in Data.HelpdeskIntegration,
        where: i.type == ^type,
        where: i.helpdesk_id == ^hid
      )
      |> Repo.one()

  def add(%Data.Helpdesk{} = helpdesk, type, specifics) do
    Data.HelpdeskIntegration.new(
      helpdesk_id: helpdesk.id,
      type: type,
      specifics: specifics
    )
    |> Repo.insert!(
      on_conflict: [set: [specifics: specifics]],
      conflict_target: [:helpdesk_id, :type]
    )
  end

  def delete(%Data.HelpdeskIntegration{} = integration) do
    integration
    |> Repo.delete!()
  end
end
