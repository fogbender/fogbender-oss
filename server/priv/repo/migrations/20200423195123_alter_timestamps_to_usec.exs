defmodule Fog.Repo.Migrations.AlterTimestampsToUsec do
  use Ecto.Migration

  def change do
    ~w/agent
      customer
      detective
      helpdesk
      org
      room
      subscription_emails
      user
      vendor
      vendor_agent_invite
      vendor_agent_role
      workspace
      workspace_agent_role/
    |> Enum.map(&String.to_atom/1)
    |> Enum.each(fn table_name ->
      alter table(table_name) do
        modify(:inserted_at, :utc_datetime_usec)
        modify(:updated_at, :utc_datetime_usec)
      end
    end)
  end
end
