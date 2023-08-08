defmodule Fog.TokenNew do
  # All times are in seconds

  def test() do
    x = token(%{x: "123"}, 123)
    %{"exp" => _, "iss" => _, "x" => "123"} = validate(x)
    key = gen_key() |> Base.url_decode64!()
    x = encrypt("123", key)
    "123" = decrypt(x, key)
  end

  def token(params, exp_in) do
    ts = ts()

    params
    |> Map.put("iss", ts)
    |> Map.put("exp", ts + exp_in)
    |> Jason.encode!()
    |> encrypt()
  end

  def validate(token), do: check_exp(decrypt(token) |> Jason.decode!())

  def encrypt(data, key \\ key()) do
    case Paseto.V2.encrypt(data, key) do
      token when is_binary(token) ->
        token

      error ->
        raise "Failed to encrypt a token: #{inspect(error)}"
    end
  end

  def decrypt(data, key \\ key()) do
    case Paseto.parse_token(data, key) do
      {:ok,
       %Paseto.Token{
         version: "v2",
         purpose: "local",
         payload: payload,
         footer: nil
       }} ->
        payload

      _ ->
        {:error, :invalid}
    end
  end

  def gen_key(), do: Base.url_encode64(:crypto.strong_rand_bytes(32))

  defp ts(), do: DateTime.to_unix(DateTime.utc_now())

  # I'm too lazy to create new 32 byte key for this
  defp key(), do: Fog.env(:fog_key_prefix) <> Fog.env(:secret_key)

  defp check_exp(%{"exp" => exp} = data) when is_integer(exp) do
    case ts() < exp do
      true -> data
      false -> {:error, :expired}
    end
  end

  defp check_exp(_), do: {:error, :invalid}
end
