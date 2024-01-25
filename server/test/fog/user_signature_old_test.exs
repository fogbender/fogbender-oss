defmodule FogUserSignatureOldTest do
  use ExUnit.Case

  setup do
    secret = Fog.UserSignature.generate_192bit_secret()
    hashes = Fog.UserSignature.example_user_hashes_old(secret)

    [hashes: hashes, secret: secret]
  end

  test "example_user_hashes generate some hashes", context do
    %{
      user_data: %{userId: "example_PLEASE_CHANGE"},
      user_hash: user_hash,
      user_jwt: user_jwt,
      user_paseto: user_paseto
    } = context.hashes

    assert String.length(user_hash) == 64
    assert String.length(user_jwt) == 123
    assert String.length(user_paseto) == 104
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
           ) === {:claims, %{"sub" => "example_PLEASE_CHANGE"}}

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
              {:error, %Jason.DecodeError{data: "example_PLEASE_CHANGE", position: 0, token: nil}}}
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
           ) === {:claims, %{"sub" => "example_PLEASE_CHANGE"}}

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

    {:ok, wrong_jwt} = Joken.Signer.sign(%{sub: user_data}, Joken.Signer.create("HS512", secret))

    assert Fog.UserSignature.verify_user_signature(
             wrong_jwt,
             user_data,
             signature_type,
             secret
           ) === {:verify, {:error, :signature_error}}
  end
end
