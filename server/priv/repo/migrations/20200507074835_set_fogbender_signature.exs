defmodule Fog.Repo.Migrations.SetFogbenderSignature do
  use Ecto.Migration

  def change do
    workspace_id = Fog.env(:fogbender_workspace_id)

    "w" <> workspace_id = workspace_id
    workspace_id = String.to_integer(workspace_id)

    signature_type = "paseto"
    signature_secret = Fog.UserSignature.generate_192bit_secret()

    execute(
      query!(
        "update workspace set signature_type=$2, signature_secret=$3 where id=$1",
        [workspace_id, signature_type, signature_secret]
      ),
      query!(
        "update workspace set signature_type=null, signature_secret=null where id=$1",
        [workspace_id]
      )
    )
  end

  defp query!(q, args) do
    fn ->
      repo().query!(q, args, log: :info)
    end
  end
end
