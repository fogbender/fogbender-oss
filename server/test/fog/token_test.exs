defmodule Fog.TokenTest do
  use ExUnit.Case

  setup do
    secret = Fog.UserSignature.generate_192bit_secret()
    hashes = Fog.UserSignature.example_user_hashes(secret)

    [hashes: hashes, secret: secret]
  end

  test "user token" do
    t = Fog.Token.for_user("u12345", 100)
    assert :user == Fog.Token.validate(t).role
    assert "u12345" == Fog.Token.validate(t).id
  end

  test "agent token" do
    t = Fog.Token.for_agent("a12345", 100)
    assert :agent == Fog.Token.validate(t).role
    assert "a12345" == Fog.Token.validate(t).id
  end

  test "invalid token" do
    assert {:error, :invalid} == Fog.Token.validate("bjfkjlaksf")
    assert {:error, :invalid} == Fog.Token.validate(Base.encode64(<<1::256>>))
  end

  test "expired token" do
    t = Fog.Token.for_user("u12345", 0)
    assert {:error, :expired} == Fog.Token.validate(t)
  end
end
