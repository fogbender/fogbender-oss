defmodule Fog.CognitoJwks.Token do
  use Joken.Config

  add_hook(JokenJwks, strategy: Fog.CognitoJwks.FetchingStrategy)

  @impl true
  def token_config do
    cognito_region = Application.get_env(:fog, :cognito_region)
    cognito_user_pool_id = Application.get_env(:fog, :cognito_user_pool_id)
    cognito_client_id = Application.get_env(:fog, :cognito_client_id)

    default_claims(
      aud: cognito_client_id,
      iss: "https://cognito-idp.#{cognito_region}.amazonaws.com/#{cognito_user_pool_id}"
    )
    |> add_claim("token_use", fn -> "" end, &(&1 == "id"))
    |> add_claim("age", fn -> 666 end, &(&1 > 18))
    |> add_claim("simple time test", fn -> 1 end, &(Joken.current_time() > &1))
  end
end
