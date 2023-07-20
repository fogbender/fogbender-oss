defmodule Fog.Web.AcceptInvite do
  import Ecto.Query, only: [from: 2]

  def check_invite_code(conn, code) do
    data =
      from(
        i in Fog.Data.VendorAgentInvite,
        where: i.code == ^code and is_nil(i.deleted_at)
      )
      |> Fog.Repo.all()

    handle_invite_code(conn, data)
  end

  defp handle_invite_code(conn, [invite]) do
    agent_id = conn.assigns[:agent_id]
    agent = Fog.Data.Agent |> Fog.Repo.get(agent_id)

    case agent do
      nil ->
        conn

      %Fog.Data.Agent{email: email} when email === invite.email ->
        {:ok,
         %{
           vendor_agent_invite: {num_accepted, _},
           vendor_agent_role: _
         }} =
          Ecto.Multi.new()
          |> Ecto.Multi.update_all(
            :vendor_agent_invite,
            from(
              i in Fog.Data.VendorAgentInvite,
              where: i.code == ^invite.code
            ),
            set: [
              deleted_at: DateTime.utc_now()
            ]
          )
          |> Ecto.Multi.insert(
            :vendor_agent_role,
            Fog.Data.VendorAgentRole.new(
              agent_id: agent_id,
              vendor_id: invite.vendor_id,
              role: invite.role
            ),
            # Auto-join might have assigned 'reader' - let's replace role here
            on_conflict: {:replace, [:role]},
            conflict_target: [:agent_id, :vendor_id]
          )
          |> Ecto.Multi.insert(
            :vendor_agent_group,
            Fog.Data.VendorAgentGroup.new(
              agent_id: agent_id,
              vendor_id: invite.vendor_id,
              group: "all"
            ),
            on_conflict: :nothing
          )
          |> Fog.Repo.transaction()

        case num_accepted == 1 do
          true ->
            :ok = Fog.Api.Event.Agent.publish(agent, invite.vendor_id)

          false ->
            :ok
        end

        conn

      %Fog.Data.Agent{email: email} ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          403,
          Jason.encode!(%{
            "error" => "email mismatch",
            "account_email" => email,
            "invite_email" => invite.email
          })
        )
        |> Plug.Conn.halt()
    end
  end

  defp handle_invite_code(conn, _) do
    conn
  end
end
