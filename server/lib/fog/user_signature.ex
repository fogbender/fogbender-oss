defmodule Fog.UserSignature do
  @doc """
  Generate secret that is a 32 bytes string, which is 24 bytes base64 encoded, it has
  24 bytes of entropy. Alernatively we could have used 32 bytes but it would require
  users to base64 decode the secret. While according to
  https://security.stackexchange.com/a/96176/72559 it's enough for HMAC key to have
  16 bytes (128 bits) of entropy.
  """
  def generate_192bit_secret() do
    {:ok, key} = Salty.Random.buf(24)
    Base.encode64(key)
  end

  def valid_192bit_secret?(secret_string) when is_binary(secret_string) do
    with {:ok, secret} <- Base.decode64(secret_string), 192 <- Kernel.bit_size(secret) do
      true
    else
      _ ->
        false
    end
  end

  def workspace_signature_with_example(signature_type, signature_secret) do
    data = %{signature_type: signature_type, signature_secret: signature_secret}
    data = Map.merge(data, example_user_hashes(signature_secret))
    data
  end

  def example_user_hashes_old(secret) do
    user_data = %{
      userId: "example_PLEASE_CHANGE"
    }

    claims = %{
      # "iat" => Joken.current_time(),
      # "exp" => Joken.current_time() + 7 * 24 * 3600,
      userId: user_data.userId
    }

    %{
      user_data: user_data,
      # sign with 192bit secret
      user_hash: hmac_digest(claims, secret),
      user_paseto: paseto_encrypt_old(claims, secret),
      user_jwt: jwt_sign_old(claims, secret)
    }
  end

  def example_user_hashes(secret) do
    # to emulate real signature check in tests
    user_data = %Fog.Api.Auth.User{
      customerId: "C256434",
      userId: "U234328"
    }

    claims = %{
      # "iat" => Joken.current_time(),
      # "exp" => Joken.current_time() + 7 * 24 * 3600,
      customerId: user_data.customerId,
      userId: user_data.userId
    }

    hashes = make_user_hashes(secret, claims)

    debug_data = %{
      # to send this to use in api request
      user_data: %{
        userId: user_data.userId,
        customerId: user_data.customerId
      },
      widget_key: get_widget_key(secret)
    }

    Map.merge(debug_data, hashes)
  end

  def make_user_hashes(secret, claims) do
    %{
      # sign with 192bit secret
      user_hash: hmac_digest(claims, secret),
      user_paseto: paseto_encrypt(claims, secret),
      user_jwt: jwt_sign(claims, secret)
    }
  end

  def hmac_digest(data, secure_key) when is_binary(secure_key) and is_map(data) do
    {:ok, hash} = Salty.Auth.Hmacsha256.auth(data.userId, secure_key)

    hmac_digest =
      hash
      |> Base.encode16()
      |> String.downcase()

    hmac_digest
  end

  def paseto_encrypt_old(data, secure_key) when is_binary(secure_key) and is_map(data) do
    "" <> _ = Paseto.V2.encrypt(Jason.encode!(%{sub: data.userId}), secure_key)
  end

  def jwt_sign_old(data, secure_key) when is_binary(secure_key) and is_map(data) do
    {:ok, jwt} = Joken.Signer.sign(%{sub: data.userId}, Joken.Signer.create("HS256", secure_key))

    jwt
  end

  def paseto_encrypt(data, secure_key) when is_binary(secure_key) and is_map(data) do
    "" <> _ = Paseto.V2.encrypt(Jason.encode!(data), secure_key)
  end

  def jwt_sign(data, secure_key) when is_binary(secure_key) and is_map(data) do
    {:ok, jwt} = Joken.Signer.sign(data, Joken.Signer.create("HS256", secure_key))

    jwt
  end

  def get_widget_key(secret) when is_binary(secret) do
    hmac_digest(%{userId: ""}, secret) |> String.slice(0..18)
  end

  def verify_widget_key(nil, _) do
    {:error, :widget_key_is_nil}
  end

  def verify_widget_key(widget_key, signature_secret) do
    real_key = get_widget_key(signature_secret)

    if real_key === widget_key do
      :ok
    else
      {:error, :widget_key_missmatch}
    end
  end

  def verify_user_signature(nil, _, _, _) do
    {:error, :signature_is_nil}
  end

  def verify_user_signature(user_hash, %{userId: user_external_id}, "hmac", signature_secret) do
    # digest = hmac_digest(user_external_id, signature_secret)
    # user_hash === digest
    user_hash =
      user_hash
      |> String.upcase()
      |> Base.decode16()

    case user_hash do
      {:ok, hash} ->
        Salty.Auth.Hmacsha256.verify(hash, user_external_id, signature_secret)

      :error ->
        {:verify, {:error, :signature_error}}
    end
  end

  def verify_user_signature(user_paseto, user_data, "paseto", signature_secret) do
    with {:parse,
          {:ok, %Paseto.Token{footer: "", payload: payload, purpose: "local", version: "v2"}}} <-
           {:parse, Paseto.Utils.parse_token(user_paseto)},
         {:decrypt, {:ok, json}} <- {:decrypt, Paseto.V2.decrypt(payload, signature_secret)},
         {:claims_json, {:ok, claims}} <- {:claims_json, Jason.decode(json)} do
      verify_claims(claims, user_data)
    end
  end

  def verify_user_signature(user_jwt, user_data, "jwt", signature_secret) do
    with {:verify, {:ok, claims}} <-
           {:verify,
            Joken.Signer.verify(user_jwt, Joken.Signer.create("HS256", signature_secret))} do
      verify_claims(claims, user_data)
    end
  end

  def verify_user_signature(user_token, %{userId: user_external_id}, "token", _signature_secret) do
    case Fog.Token.validate(user_token) do
      %{type: "user_token", external_uid: ^user_external_id} ->
        :ok

      _ ->
        {:verify, {:error, :signature_error}}
    end
  end

  def verify_claims(claims, user_data) do
    %{userId: user_external_id} = user_data

    case claims do
      %{"sub" => ^user_external_id} ->
        :ok

      %{"sub" => _} ->
        {:claims, claims}

      _ ->
        user_data = Map.delete(user_data, :__struct__)
        verify_user_data_mathes(claims, user_data)
    end
  end

  def verify_user_data_mathes(claims, user_data) do
    required = [:userId]

    case [
           :customerId,
           :customerName,
           :userId,
           :userName,
           :userEmail,
           :userAvatarUrl
         ]
         |> Enum.all?(fn field ->
           claim = claims[Atom.to_string(field)]
           user_field = user_data[field]

           if is_nil(claim) do
             not Enum.member?(required, field)
           else
             claim === user_field
           end
         end) do
      true ->
        :ok

      _ ->
        {:claims, claims}
    end
  end
end
