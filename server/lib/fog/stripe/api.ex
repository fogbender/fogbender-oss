defmodule Fog.Stripe.Api do
  require Logger

  @stripe_base_url "https://api.stripe.com"

  def check_access() do
    r =
      client()
      |> Tesla.get("/v1/customers")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def create_checkout_session(seats) do
    r =
      post(
        "/v1/checkout/sessions",
        %{
          "line_items[0][price]" => Fog.env(:stripe_price_id),
          "line_items[0][quantity]" => seats,
          "mode" => "subscription",
          "success_url" =>
            "#{Fog.env(:fog_storefront_url)}/admin/-/billing?session_id={CHECKOUT_SESSION_ID}",
          "cancel_url" => "#{Fog.env(:fog_storefront_url)}/admin/-/billing"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        body
    end
  end

  def get_checkout_session(session_id) do
    r =
      client()
      |> Tesla.get("/v1/checkout/sessions/#{session_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_customer(customer_id) do
    r =
      client()
      |> Tesla.get("/v1/customers/#{customer_id}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_subscriptions(customer_id) do
    r =
      client()
      |> Tesla.get("/v1/subscriptions",
        query: [
          customer: customer_id
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def create_portal_session(customer_id) do
    r =
      post(
        "/v1/billing_portal/sessions",
        %{
          "customer" => customer_id,
          "return_url" => "#{Fog.env(:fog_storefront_url)}/admin/-/billing"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        body
    end
  end

  def set_subscription_plan_quantity(subscription_item_id, quantity) do
    r =
      post(
        "/v1/subscription_items/#{subscription_item_id}",
        %{
          "quantity" => quantity,
          "proration_behavior" => "always_invoice"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def get_price() do
    r =
      client()
      |> Tesla.get("/v1/prices/#{Fog.env(:stripe_price_id)}")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  defp post(path, map), do: client() |> Tesla.post(path, URI.encode_query(map))

  defp client() do
    base_url = {Tesla.Middleware.BaseUrl, @stripe_base_url}
    json = Tesla.Middleware.JSON
    form = Tesla.Middleware.FormUrlencoded
    query = Tesla.Middleware.Query
    auth = {Tesla.Middleware.BasicAuth, %{username: Fog.env(:stripe_secret_key)}}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, form, query, headers, auth]

    Tesla.client(middleware)
  end
end
