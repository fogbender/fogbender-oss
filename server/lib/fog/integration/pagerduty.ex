defmodule Fog.Integration.PagerDuty do
  @behaviour Fog.Integration.Behaviour

  require Logger

  @api_url "https://api.pagerduty.com"
  @auth_url "https://identity.pagerduty.com"

  def token(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["user_token"]
  end

  def url(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["workspace_url"]
  end

  def name(%Fog.Data.WorkspaceIntegration{} = i) do
    i.specifics["workspace_name"]
  end

  def integration_tag_name(%Fog.Data.WorkspaceIntegration{} = i) do
    ":pagerduty:#{i.project_id}"
  end

  def commands(_), do: nil

  def oncall_emails(access_token, schedule_id) do
    {:ok, %{"oncalls" => oncalls}} = oncalls(access_token, schedule_id)

    oncalls
    |> Enum.map(fn %{"user" => %{"email" => email}} ->
      email
    end)
    |> Enum.uniq()
  end

  def oncalls(access_token, schedule_id) do
    r =
      client(access_token)
      |> Tesla.get("/oncalls",
        query: [
          include: ["users"],
          schedule_ids: [schedule_id]
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def schedules(access_token) do
    r =
      client(access_token)
      |> Tesla.get("/schedules",
        query: [
          include: []
        ]
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: %{"schedules" => schedules}}} ->
        {:ok, schedules}
    end
  end

  def users_me(access_token) do
    r =
      client(access_token)
      |> Tesla.get("/users/me")

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        {:ok, body}
    end
  end

  def oauth_code(code, verifier) do
    r =
      oauth_client()
      |> Tesla.post(
        "/oauth/token",
        %{
          "client_id" => Fog.env(:pagerduty_client_id),
          "code_verifier" => verifier,
          "code" => code,
          "redirect_uri" => Fog.env(:pagerduty_redirect_uri),
          "grant_type" => "authorization_code"
        }
      )

    case r do
      {:ok, %Tesla.Env{status: 200, body: body}} ->
        %{
          "access_token" => access_token,
          "refresh_token" => refresh_token
        } = body

        # security: send access token to client only in encrypted form
        # because we don't know at this point for what integration
        # that token is going to be used so we can't store the token in DB yet
        user_token =
          Fog.Integration.OAuth.encrypt(
            access_token,
            refresh_token
          )

        {:ok,
         %{
           "user" => %{
             "email" => email,
             "name" => name,
             "avatar_url" => pictureUrl
           }
         }} = users_me(access_token)

        user_info = %{
          "email" => email,
          "username" => name,
          "pictureUrl" => pictureUrl
        }

        {:ok, %{userToken: user_token, userInfo: user_info}}

      _ ->
        {:error, r}
    end
  end

  defp oauth_client() do
    base_url = {Tesla.Middleware.BaseUrl, @auth_url}
    form_url_encoded = Tesla.Middleware.FormUrlencoded
    json = Tesla.Middleware.JSON

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, form_url_encoded, headers, json]

    Tesla.client(middleware)
  end

  defp client(user_token) do
    base_url = {Tesla.Middleware.BaseUrl, @api_url}
    json = Tesla.Middleware.JSON
    query = Tesla.Middleware.Query

    refresh_token =
      {Fog.Lib.RefreshTokenMiddleware,
       user_token: user_token,
       has_expired: fn
         #  {:ok, %{body: %{"error" => %{"message" => "This access token is expired"}}}} ->
         {:ok, %{status: 401}} ->
           true

         _ ->
           false
       end,
       exchange_token: fn refresh_token ->
         r =
           oauth_client()
           |> Tesla.post(
             "/oauth/token",
             %{
               client_id: Fog.env(:pagerduty_client_id),
               client_secret: Fog.env(:pagerduty_client_secret),
               refresh_token: refresh_token,
               grant_type: "refresh_token"
             }
           )

         case r do
           {:ok, %Tesla.Env{status: 200, body: body}} ->
             %{
               "access_token" => access_token,
               "refresh_token" => refresh_token
             } = body

             {:ok,
              %{
                "access_token" => access_token,
                "refresh_token" => refresh_token
              }}
         end
       end}

    headers =
      {Tesla.Middleware.Headers,
       [
         {
           "accept",
           "application/json"
         }
       ]}

    middleware = [base_url, json, query, headers, refresh_token]

    Tesla.client(middleware)
  end
end
