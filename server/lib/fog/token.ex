defmodule Fog.Token do
  # All times are in seconds

  @alg :aes_128_gcm
  @aad "FOG TOKEN AES128GCM"
  @year 60 * 60 * 24 * 365
  @hour 60 * 60

  def for_user(id, exp_in), do: token(%{role: :user, id: id}, exp_in)

  def for_agent(id, exp_in), do: token(%{role: :agent, id: id}, exp_in)

  def for_public_file(id, path) do
    token(%{type: :file_token, file_id: id, file_path: path}, @year)
  end

  def for_vendor_api(vendor_id, token_id, scopes) do
    token(
      %{type: :vendor_api_token, vendor_id: vendor_id, token_id: token_id, scopes: scopes},
      @year
    )
  end

  def for_user_signature(external_uid, exp_in) do
    token(%{type: "user_token", external_uid: external_uid}, exp_in)
  end

  def for_unsubscribe_email(user_id, exp_in) do
    token(%{type: "email_token", user_id: user_id}, exp_in)
  end

  def for_email(user_id, exp_in) do
    token(%{type: "email_token", user_id: user_id, aud: "client"}, exp_in)
  end

  def for_fallback_email(workspace_id, email, name, exp_in) do
    token(
      %{
        type: "fallback_email_token",
        aud: "client",
        email: email,
        name: name,
        workspace_id: workspace_id
      },
      exp_in
    )
  end

  def for_integration(access_token, refresh_token) do
    token(
      %{
        "type" => "integration_token",
        "access_token" => access_token,
        "refresh_token" => refresh_token
      },
      @hour
    )
  end

  def token(params, exp_in) do
    ts = ts()

    params
    |> Map.put(:iss, ts)
    |> Map.put(:exp, ts + exp_in)
    |> encrypt()
  end

  def validate(token), do: check_exp(decrypt(token))

  def encrypt(data, key \\ key()) do
    data = :erlang.term_to_binary(data)
    iv = :crypto.strong_rand_bytes(16)
    {cipher, tag} = :crypto.crypto_one_time_aead(@alg, key, iv, data, @aad, true)
    (iv <> tag <> cipher) |> Base.url_encode64(padding: false)
  end

  def decrypt(data, key \\ key()) do
    base64 =
      case Base.url_decode64(data, padding: false) do
        {:ok, data} ->
          {:ok, data}

        _ ->
          Base.decode64(data)
      end

    with {:ok, <<iv::binary-16, tag::binary-16, cipher::binary>>} <- base64,
         data <- :crypto.crypto_one_time_aead(@alg, key, iv, cipher, @aad, tag, false),
         true <- data != :error do
      :erlang.binary_to_term(data, [:safe])
    else
      _ -> {:error, :invalid}
    end
  end

  def gen_key(), do: Base.encode64(:crypto.strong_rand_bytes(16))

  defp ts(), do: DateTime.to_unix(DateTime.utc_now())

  defp key(), do: Fog.env(:secret_key)

  defp check_exp(%{exp: exp} = data) when is_integer(exp) do
    case ts() < exp do
      true -> data
      false -> {:error, :expired}
    end
  end

  defp check_exp(_), do: {:error, :invalid}
end
