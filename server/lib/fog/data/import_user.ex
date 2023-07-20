defmodule Fog.Data.ImportUser do
  use Fog.Data

  @fields ~w(
    customer_id
    customer_name
    user_id
    user_name
    user_email
    user_picture
  )a

  @optional ~w(user_picture)a

  @derive {Jason.Encoder, only: @fields}
  @primary_key false
  embedded_schema do
    field(:customer_name, :string)
    field(:customer_id, :string)
    field(:user_id, :string)
    field(:user_name, :string)
    field(:user_email, :string)
    field(:user_picture, :string)
  end

  def changeset(import_user, params \\ %{}) do
    import_user
    |> cast(params, @fields)
    |> validate_required(@fields -- @optional)
    |> validate_format(:user_email, ~r/@/)
  end

  def from_csv(csv_entries) do
    users =
      csv_entries
      |> Stream.map(&new/1)
      |> Enum.split_with(& &1.valid?)

    case users do
      {valid, []} ->
        res =
          valid
          |> Enum.map(&Ecto.Changeset.apply_changes/1)

        {:ok, res}

      {_, invalid} ->
        {:error, invalid}
    end
  end
end
