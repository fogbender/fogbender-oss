defmodule Fog.Integration.Behaviour do
  @callback token(arg :: term) :: binary

  @callback url(arg :: term) :: binary

  @callback name(arg :: term) :: binary

  @callback integration_tag_name(arg :: term) :: binary

  @callback commands(arg :: term) :: nil | [binary]
end
