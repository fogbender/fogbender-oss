defmodule Fog.Lib.RefreshTokenMiddleware do
  @moduledoc """
  Middleware that allows you to work with APIs that require OAuth2 refresh tokens.

  The middleware will actually work if just `access_token` strill is passed instead of access_token and refresh_token object, but obviously it will not work if the access_token is expired.

  ## Example usage

  ```
  defp client(user_token) do
    refresh_token =
      {Fog.Lib.RefreshTokenMiddleware,
       user_token: user_token,
       has_expired: &match?({:ok, %{status: 401}}, &1),
       exchange_token: fn refresh_token ->
         r =
           Tesla.post(
             "/oauth/tokens",
             %{
               refresh_token: refresh_token,
               grant_type: "refresh_token",
             }
           )

         case r do
           {:ok, %Tesla.Env{status: 200, body: body}} ->
             {:ok, body}
         end
       end}

    middleware = [refresh_token]

    Tesla.client(middleware)
  end
  ```
  """
  @behaviour Tesla.Middleware

  @impl true
  def call(env, next, opts) do
    opts = opts || []

    user_token = Keyword.fetch!(opts, :user_token)
    has_expired = Keyword.fetch!(opts, :has_expired)
    exchange_token = Keyword.fetch!(opts, :exchange_token)

    {access_token, refresh_token} = unpack_token(user_token)

    res = run_with_access_token(env, next, access_token)

    # if access token has expired, exchange for a new one, keep in mind that
    # user_token could be just a string, in that case we don't have a refresh_token
    if refresh_token && has_expired.(res) do
      {:ok, user_token} = exchange_token.(refresh_token)
      env = env |> Tesla.put_opt(:new_user_token, user_token)

      access_token = user_token["access_token"]
      run_with_access_token(env, next, access_token)
    else
      res
    end
  end

  defp unpack_token("" <> access_token) do
    {access_token, nil}
  end

  defp unpack_token(x) do
    {x["access_token"], x["refresh_token"]}
  end

  defp run_with_access_token(env, next, access_token) do
    headers = [
      {
        "authorization",
        "Bearer #{access_token}"
      }
    ]

    # important that this header is only set inside this block
    # otherwise you will get an array of authorization headers
    env = env |> Tesla.put_headers(headers)

    Tesla.run(env, next)
  end
end
