defmodule Fog.Web.DetectiveAPIRouter do
  import Ecto.Query, only: [select: 3, order_by: 2, where: 2]

  use Plug.Router
  plug(:match)
  plug(:fetch_query_params)
  plug(Fog.Plug.DetectiveSession)
  plug(:dispatch)

  get "/vendors/:vendor_id/agents" do
    fields = [:id, :name, :email, :inserted_at]

    data =
      Ecto.Query.from(
        a in Fog.Data.Agent,
        join: r in Fog.Data.VendorAgentRole,
        on: r.agent_id == a.id,
        where: r.vendor_id == ^vendor_id,
        select: ^fields
      )
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/agents/:id" do
    data =
      Fog.Data.Agent
      |> Fog.Repo.get(id)
      |> Fog.Repo.preload([:my_fogvites, :fogvited])
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/vendors/:vendor_id/workspaces" do
    fields = [:id, :name, :inserted_at]

    data =
      Ecto.Query.from(
        w in Fog.Data.Workspace,
        where: w.vendor_id == ^vendor_id,
        select: ^fields
      )
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/workspaces/:id" do
    data =
      Fog.Data.Workspace
      |> Fog.Repo.get(id)
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/workspaces/:workspace_id/helpdesks" do
    data =
      Ecto.Query.from(
        h in Fog.Data.Helpdesk,
        join: c in Fog.Data.Customer,
        on: c.id == h.customer_id,
        where: h.workspace_id == ^workspace_id,
        select: %{
          "id" => h.id,
          "customer_id" => h.customer_id,
          "name" => c.name,
          "inserted_at" => h.inserted_at
        }
      )
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/helpdesks/:id" do
    helpdesk =
      Fog.Data.Helpdesk
      |> Fog.Repo.get(id)

    customer =
      Fog.Data.Customer
      |> Fog.Repo.get(helpdesk.customer_id)

    data =
      %{helpdesk: helpdesk, customer: customer}
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/helpdesks/:helpdesk_id/users" do
    fields = [:id, :name, :inserted_at]

    data =
      Ecto.Query.from(
        u in Fog.Data.User,
        where: u.helpdesk_id == ^helpdesk_id,
        select: ^fields
      )
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/users/:id" do
    data =
      Fog.Data.User
      |> Fog.Repo.get(id)
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/customers/:id/" do
    data =
      Fog.Data.Customer
      |> Fog.Repo.get(id)
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/vendors" do
    fields = [:id, :name, :inserted_at]

    data =
      Fog.Data.Vendor
      |> select([e], ^fields)
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/vendors/:id" do
    data =
      Fog.Data.Vendor
      |> Fog.Repo.get(id)
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  post "/make_fogvited/:agent_id" do
    {:ok, _fogvite} =
      Fog.Data.Fogvite.new(
        id: nil,
        sender_agent_id: agent_id,
        invite_sent_to_email: "invited by detective",
        accepted_by_agent_id: agent_id
      )
      |> Fog.Repo.insert()

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    Redirecting back
    <script>
    history.go(-1);
    </script>
    """)
  end

  post "/fogvites/:agent_id" do
    for _ <- 1..3 do
      {:ok, _fogvite} =
        Fog.Data.Fogvite.new(
          id: nil,
          sender_agent_id: agent_id,
          invite_sent_to_email: nil,
          accepted_by_agent_id: nil
        )
        |> Fog.Repo.insert()
    end

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(200, """
    Redirecting back
    <script>
    history.go(-1);
    </script>
    """)
  end

  delete "/fogvites/:id" do
    {:ok, _} =
      Fog.Data.Fogvite
      |> Fog.Repo.get(id)
      |> Fog.Data.Fogvite.update(deleted_at: DateTime.utc_now())
      |> Fog.Repo.update()

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, %{success: true} |> Jason.encode!(pretty: true))
  end

  post "/search" do
    # https://stackoverflow.com/a/34961570/74167
    conn =
      Plug.Parsers.call(
        conn,
        Plug.Parsers.init(parsers: [Plug.Parsers.URLENCODED, Plug.Parsers.MULTIPART])
      )

    email = conn.body_params["email"]
    pattern = Fog.Utils.to_search_pattern(email)

    agents =
      Ecto.Query.from(
        a in Fog.Data.Agent,
        where: ilike(a.email, ^pattern)
      )
      |> Fog.Repo.all()

    data = agents |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/fogvite_codes" do
    data =
      Fog.Data.FogviteCode
      |> order_by(desc: :inserted_at)
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  post "/fogvite_codes" do
    {:ok, data, conn} = Plug.Conn.read_body(conn)

    {:ok,
     %{
       "code" => code,
       "limit" => limit,
       "disabled" => disabled
     }} = Jason.decode(data)

    {:ok, fogvite_code} =
      Fog.Repo.insert(
        Fog.Data.FogviteCode.new(
          code: code,
          limit: limit,
          disabled: disabled
        ),
        on_conflict: {:replace, [:limit, :disabled]},
        conflict_target: :code,
        returning: true
      )

    data = fogvite_code |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  get "/fogvite_codes/:code_id" do
    data =
      Fog.Data.Fogvite
      |> where(fogvite_code: ^code_id)
      |> order_by(desc: :inserted_at)
      |> Fog.Repo.all()
      |> Jason.encode!(pretty: true)

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end
end
