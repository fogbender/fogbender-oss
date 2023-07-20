defmodule Fog.Repo.CrmNoteMapping do
  alias Fog.{Data, Repo}

  def get_bucket(params) do
    Data.CrmNoteMapping.new(params)
    |> Repo.insert!(
      on_conflict: :nothing,
      conflict_target: [:room_id, :crm_id, :crm_type, :inserted_at]
    )

    Data.CrmNoteMapping |> Repo.get_by(params)
  end

  def update(model, params) do
    model
    |> Data.CrmNoteMapping.update(params)
    |> Repo.update!()
  end
end
