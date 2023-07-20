defmodule Fog.Integration.OAuth do
  def encrypt(
        access_token,
        refresh_token
      ) do
    Fog.Token.for_integration(
      access_token,
      refresh_token
    )
  end

  def decrypt(integration_token) do
    case Fog.Token.validate(integration_token) do
      %{
        "type" => "integration_token",
        "access_token" => access_token,
        "refresh_token" => refresh_token
      } ->
        {:ok,
         %{
           "access_token" => access_token,
           "refresh_token" => refresh_token
         }}

      {:error, :invalid} ->
        {:error, :token_invalid}

      {:error, :expired} ->
        {:error, :token_expired}

      _ ->
        {:error, :token_invalid}
    end
  end
end
