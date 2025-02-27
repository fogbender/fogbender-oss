defmodule Fog.Web.ApiInvitesRouter do
  require Logger
  require Ecto.Query.API

  use Plug.Router

  alias Fog.{Data, Repo, Mailer}

  # TODO: write tests for all this - really

  plug(:match)

  plug(:fetch_query_params)

  plug(Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Jason
  )

  plug(Fog.Plug.AgentSession)

  plug(:dispatch)

  post "/" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, invite} = Jason.decode(data)

    our_role = our_role(conn, invite["vendor_id"])
    minimum_role = "admin"

    if role_at_or_above(our_role, minimum_role) do
      agent_id = conn.assigns[:agent_id]

      {:ok, invite_id} = Snowflake.next_id()

      code = :crypto.strong_rand_bytes(24) |> Base.url_encode64()

      tx =
        Ecto.Multi.new()
        |> Ecto.Multi.insert(
          :vendor_agent_invite,
          Data.VendorAgentInvite.new(
            invite_id: invite_id,
            vendor_id: invite["vendor_id"],
            email: String.downcase(invite["email"]),
            role: invite["role"],
            from_agent_id: agent_id,
            code: code
          )
        )
        |> Repo.transaction()

      case tx do
        {:ok, %{vendor_agent_invite: _}} ->
          accept_url = "#{Fog.env(:fog_storefront_url)}/admin?code=#{code}"
          html = "To accept your Fogbender invite, click here: #{accept_url}"
          text = html
          email = invite["email"]

          Logger.info("Sending email invite to #{email}")

          Bamboo.Email.new_email(
            to: email,
            from: Mailer.source(),
            subject: "Your Fogbender invite",
            html_body: html,
            text_body: text
          )
          |> Mailer.send()

          ok_no_content(conn)

        {:error, :vendor_agent_invite, %Ecto.Changeset{errors: errors}, _} ->
          error =
            errors
            |> Enum.reduce(
              %{error: "unknown error"},
              fn
                {:email, _email_error}, _ ->
                  %{error: %{code: "invalid_email"}}

                _, acc ->
                  acc
              end
            )

          bad_request_json(conn, error |> Jason.encode!(pretty: true))
      end
    else
      forbid_json(
        conn,
        %{error: %{code: "permission", minimum_role: minimum_role, current_role: our_role}}
        |> Jason.encode!(pretty: true)
      )
    end
  end

  delete "/:invite_id" do
    invite = Data.VendorAgentInvite |> Repo.get_by(invite_id: invite_id)
    our_role = our_role(conn, invite.vendor_id)

    if role_at_or_above(our_role, "admin") do
      if invite do
        invite
        |> Data.VendorAgentInvite.update(deleted_at: DateTime.utc_now())
        |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  post "/:invite_id" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, new_invite} = Jason.decode(data)
    role = new_invite["role"]

    invite = Data.VendorAgentInvite |> Repo.get_by(invite_id: invite_id)
    our_role = our_role(conn, invite.vendor_id)

    if role_at_or_above(our_role, "admin") do
      if invite do
        invite
        |> Data.VendorAgentInvite.update(role: role)
        |> Repo.update!()
      end

      ok_no_content(conn)
    else
      forbid(conn)
    end
  end

  defp role_at_or_above(role, "reader"),
    do: Enum.member?(["reader", "agent", "admin", "owner"], role)

  defp role_at_or_above("agent", "agent"), do: true
  defp role_at_or_above("admin", "agent"), do: true
  defp role_at_or_above("owner", "agent"), do: true
  defp role_at_or_above(_, "agent"), do: false

  defp role_at_or_above("admin", "admin"), do: true
  defp role_at_or_above("owner", "admin"), do: true
  defp role_at_or_above(_, "admin"), do: false

  defp role_at_or_above("owner", "owner"), do: true
  defp role_at_or_above(_, "owner"), do: false

  defp our_role(conn, vendor_id) do
    our_agent_id = conn.assigns[:agent_id]

    case Data.VendorAgentRole
         |> Repo.get_by(agent_id: our_agent_id, vendor_id: vendor_id) do
      nil ->
        nil

      %Data.VendorAgentRole{:role => role} ->
        role
    end
  end

  defp bad_request_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(400, data)
  end

  defp forbid_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(403, data)
  end

  defp forbid(conn, message \\ "") do
    conn |> send_resp(403, message)
  end

  defp ok_no_content(conn) do
    conn |> send_resp(204, "")
  end
end
