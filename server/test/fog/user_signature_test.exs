defmodule FogUserSignatureTest do
  use ExUnit.Case

  setup do
    secret = Fog.UserSignature.generate_192bit_secret()
    hashes = Fog.UserSignature.example_user_hashes(secret)

    [hashes: hashes, secret: secret]
  end

  test "example_user_hashes generate some hashes", context do
    %{
      user_data: %{userId: "U234328", customerId: "C256434"},
      user_hash: user_hash,
      user_jwt: user_jwt,
      user_paseto: user_paseto
    } = context.hashes

    assert String.length(user_hash) == 64
    assert String.length(user_jwt) == 139
    assert String.length(user_paseto) == 120
  end

  test "verify_user_signature hmac", %{secret: secret, hashes: hashes} do
    %{user_data: user_data, user_hash: user_hash} = hashes
    signature_type = "hmac"

    assert Fog.UserSignature.verify_user_signature(
             user_hash,
             user_data,
             signature_type,
             secret
           ) === :ok

    assert Fog.UserSignature.verify_user_signature(
             user_hash,
             %{user_data | userId: user_data.userId <> "x"},
             signature_type,
             secret
           ) === {:error, :no_match}
  end

  test "verify_user_signature paseto", %{secret: secret, hashes: hashes} do
    %{user_data: user_data, user_paseto: user_paseto} = hashes
    signature_type = "paseto"

    assert Fog.UserSignature.verify_user_signature(
             user_paseto,
             user_data,
             signature_type,
             secret
           ) === :ok
  end

  test "verify_user_signature fails if paseto is wrong", %{secret: secret, hashes: hashes} do
    %{user_data: user_data, user_paseto: user_paseto} = hashes
    signature_type = "paseto"

    assert Fog.UserSignature.verify_user_signature(
             user_paseto <> "x",
             user_data,
             signature_type,
             secret
           ) === {:decrypt, {:error, :forged}}

    assert Fog.UserSignature.verify_user_signature(
             user_paseto,
             %{user_data | userId: user_data.userId <> "x"},
             signature_type,
             secret
           ) ===
             {:claims, %{"userId" => "U234328", "customerId" => "C256434"}}

    assert Fog.UserSignature.verify_user_signature(
             user_paseto,
             user_data,
             signature_type,
             Fog.UserSignature.generate_192bit_secret()
           ) === {:decrypt, {:error, :forged}}

    wrong_paseto = Paseto.V2.encrypt(user_data.userId, secret)

    assert Fog.UserSignature.verify_user_signature(
             wrong_paseto,
             user_data,
             signature_type,
             secret
           ) ===
             {:claims_json,
              {:error, %Jason.DecodeError{data: "U234328", position: 0, token: nil}}}
  end

  test "verify_user_signature jwt", %{secret: secret, hashes: hashes} do
    %{
      user_data: user_data,
      user_jwt: user_jwt
    } = hashes

    signature_type = "jwt"

    assert Fog.UserSignature.verify_user_signature(
             user_jwt,
             user_data,
             signature_type,
             secret
           ) === :ok
  end

  test "verify_user_signature fails if jwt is wrong", %{secret: secret, hashes: hashes} do
    %{user_data: user_data, user_jwt: user_jwt} = hashes
    signature_type = "jwt"

    assert Fog.UserSignature.verify_user_signature(
             user_jwt <> "x",
             user_data,
             signature_type,
             secret
           ) === {:verify, {:error, :signature_error}}

    assert Fog.UserSignature.verify_user_signature(
             user_jwt,
             %{user_data | userId: user_data.userId <> "x"},
             signature_type,
             secret
           ) ===
             {:claims, %{"userId" => "U234328", "customerId" => "C256434"}}

    # wrong customerId
    assert Fog.UserSignature.verify_user_signature(
             user_jwt,
             %{user_data | customerId: user_data.customerId <> "x"},
             signature_type,
             secret
           ) ===
             {:claims, %{"userId" => "U234328", "customerId" => "C256434"}}

    assert Fog.UserSignature.verify_user_signature(
             user_jwt,
             user_data,
             signature_type,
             Fog.UserSignature.generate_192bit_secret()
           ) === {:verify, {:error, :signature_error}}

    {:ok, wrong_jwt} = Joken.Signer.sign(%{}, Joken.Signer.create("HS256", secret))

    assert Fog.UserSignature.verify_user_signature(
             wrong_jwt,
             user_data,
             signature_type,
             secret
           ) === {:claims, %{}}

    # no customerId
    {:ok, wrong_jwt} =
      Joken.Signer.sign(%{userId: user_data.userId}, Joken.Signer.create("HS256", secret))

    assert Fog.UserSignature.verify_user_signature(
             wrong_jwt,
             user_data,
             signature_type,
             secret
           ) === :ok

    #  {:claims, %{"userId" => "example_PLEASE_CHANGE"}}

    {:ok, wrong_jwt} =
      Joken.Signer.sign(%{sub: user_data.userId}, Joken.Signer.create("HS512", secret))

    assert Fog.UserSignature.verify_user_signature(
             wrong_jwt,
             user_data,
             signature_type,
             secret
           ) === {:verify, {:error, :signature_error}}
  end

  test "verify_user_data_mathes works on real data", %{} do
    claims = %{
      "customerId" => "v00265727382369865728",
      "customerName" => "Demo",
      "userId" => "a00265247089888333824",
      "userName" => "Example User",
      "userEmail" => "someuser@example.com",
      "userAvatarUrl" =>
        "https://lh3.googleusercontent.com/a-/AOh14GhB06QVbtgwObqjbqysKIDye5jrLpmo3Cd2psS85w=s96-c"
    }

    auth = %Fog.Api.Auth.User{
      customerId: "v00265727382369865728",
      customerName: "Demo",
      msgId: "drnm2i",
      msgType: "Auth.User",
      userAvatarUrl:
        "https://lh3.googleusercontent.com/a-/AOh14GhB06QVbtgwObqjbqysKIDye5jrLpmo3Cd2psS85w=s96-c",
      userEmail: "someuser@example.com",
      userHMAC: nil,
      userId: "a00265247089888333824",
      userJWT: nil,
      userName: "Example User",
      userPaseto:
        "v2.local.PbGrcj0e03knT3zaD75-ISrxznQI5jnusuIkTMO8uaBX_bJOf1qelazOe49pF_vttA5476Qsh0SL9qU4q4f5iQ6fZWEhwSYHVwM",
      userToken: nil,
      widgetId: "dzAwMDM5MjEwMzI4NzA1MjA4MzIw"
    }

    assert Fog.UserSignature.verify_claims(claims, auth) === :ok
  end
end
