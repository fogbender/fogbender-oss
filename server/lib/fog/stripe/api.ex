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
            "#{Fog.env(:fog_storefront_url)}/admin/-/billing?session_id={CHECKOUT_SESSION_ID}"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        body
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
