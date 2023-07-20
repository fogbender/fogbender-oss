defmodule Fog.Repo.ConnectCode do
  import Ecto.Query, only: [from: 2]

  alias Fog.{Data, Repo}

  def create_connect_code(helpdesk_id) do
    code = :rand.uniform(9999) |> Integer.to_string() |> Base.encode64(padding: false)

    try do
      %Data.ConnectCode{} =
        Data.ConnectCode.new(code: code, helpdesk_id: helpdesk_id) |> Repo.insert!()

      {:ok, code}
    rescue
      _e in Ecto.ConstraintError ->
        create_connect_code(helpdesk_id)
    end
  end

  def delete(code) do
    {1, _} =
      from(
        c in Data.ConnectCode,
        where: c.code == ^code
      )
      |> Repo.delete_all()

    :ok
  end
end
