defmodule Fog.Web.ApiVendorInvitesRouter do
  require Logger
  require Ecto.Query.API

  import Ecto.Query, only: [from: 2]

  use Plug.Router

  alias Fog.{Data, Repo, Mailer, Web}

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

  get "/" do
    our_agent_id = conn.assigns[:agent_id]

    data =
      from(
        i in Data.VendorAgentInvite,
        where:
          is_nil(i.deleted_at) and
            i.email in subquery(
              from(a in Data.Agent, select: a.email, where: a.id == ^our_agent_id)
            )
      )
      |> Repo.all()
      |> Repo.preload([:from_agent, :vendor])

    ok_json(conn, data |> Jason.encode!())
  end

  get "/:code" do
    our_agent_id = conn.assigns[:agent_id]

    data =
      from(
        i in Data.VendorAgentInvite,
        where:
          is_nil(i.deleted_at) and
            (i.code == ^code or
               i.email in subquery(
                 from(a in Data.Agent, select: a.email, where: a.id == ^our_agent_id)
               ))
      )
      |> Repo.all()
      |> Repo.preload([:from_agent, :vendor])

    ok_json(conn, data |> Jason.encode!())
  end

  post "/accept" do
    # anyone who knows the code can accept it
    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    our_agent_id = conn.assigns[:agent_id]

    name = from(a in Data.Agent, select: a.name, where: a.id == ^our_agent_id) |> Repo.one()

    code = data["code"]
    invite = Data.VendorAgentInvite |> Repo.get_by(code: code)
    invite = invite |> Repo.preload([:from_agent, :vendor])

    text =
      "#{invite.email}, now known as #{name}, has accepted your invitation to join #{invite.vendor.name} on Fogbender."

    conn = Web.AcceptInvite.check_invite_code(conn, code)

    Bamboo.Email.new_email(
      to: invite.from_agent.email,
      from: Mailer.source(),
      subject: "Invitation accepted",
      text_body: text
    )
    |> Mailer.send()

    :ok = update_billing(invite.vendor_id)

    if conn.halted do
      conn
    else
      ok_no_content(conn)
    end
  end

  post "/decline" do
    # anyone can decline the invite if they know the code

    {:ok, data, conn} = Plug.Conn.read_body(conn)
    {:ok, data} = Jason.decode(data)
    code = data["code"]

    invite = Data.VendorAgentInvite |> Repo.get_by(code: code)

    if invite do
      invite
      |> Data.VendorAgentInvite.update(deleted_at: DateTime.utc_now())
      |> Repo.update!()

      invite = invite |> Repo.preload([:from_agent, :vendor])

      text =
        "#{invite.email} has declined your invitation to join #{invite.vendor.name} on Fogbender."

      Bamboo.Email.new_email(
        to: invite.from_agent.email,
        from: Mailer.source(),
        subject: "Invitation declined",
        text_body: text
      )
      |> Mailer.send()
    end

    ok_no_content(conn)
  end

  defp ok_no_content(conn) do
    conn |> send_resp(204, "")
  end

  defp ok_json(conn, data) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(200, data)
  end

  defp count_used_seats(vendor_id) do
    [count_used_seats] =
      from(
        var in Data.VendorAgentRole,
        join: v in Data.Vendor,
        on: v.id == var.vendor_id,
        where: var.vendor_id == ^vendor_id,
        where: var.role in ["owner", "admin", "agent"],
        select: count(var.agent_id)
      )
      |> Repo.all()

    count_used_seats
  end

  defp update_billing(vendor_id) do
    # TODO: this should be done as an async task so that we don't crash the request that triggered update_billing and so that we can retry it if it fails
    free_seats =
      from(
        v in Data.Vendor,
        where: v.id == ^vendor_id,
        select: v.free_seats
      )
      |> Repo.one()

    count_used_seats = count_used_seats(vendor_id)

    stripe_customer_ids =
      from(
        c in Data.VendorStripeCustomer,
        where: c.vendor_id == ^vendor_id,
        select: c.stripe_customer_id
      )
      |> Repo.all()

    subscriptions =
      stripe_customer_ids
      |> Enum.flat_map(fn stripe_customer_id ->
        {:ok, %{"data" => subscriptions}} = Fog.Stripe.Api.get_subscriptions(stripe_customer_id)

        subscriptions
      end)

    subscription =
      subscriptions
      |> Enum.find(fn s ->
        s["status"] === "active" && is_nil(s["canceled_at"])
      end)

    subscription =
      if !subscription do
        subscriptions |> Enum.find(fn s -> s["status"] === "active" end)
      else
        subscription
      end

    subscription =
      if !subscription do
        subscriptions |> Enum.at(0)
      else
        subscription
      end

    if subscription && count_used_seats - free_seats > 0 do
      %{"items" => %{"data" => [subscription_item]}} = subscription

      case Fog.Stripe.Api.set_subscription_plan_quantity(
             subscription_item["id"],
             count_used_seats - free_seats
           ) do
        {:ok, _} ->
          :ok

        err ->
          Logger.error("Subscription / billing update error: #{inspect(err)}")
          :ok
      end
    else
      :ok
    end
  end
end
