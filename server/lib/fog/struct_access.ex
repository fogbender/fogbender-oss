defmodule Fog.StructAccess do
  @moduledoc """
  Implements simple Access behaviour for Structs.

  Example:

  ```
  defmodule Mystruct do
    use Fog.StructAccess
    defstruct [id, name, items]
  end

  put_in(%Mystruct{}, [:items, Access.key("ITEM1", %{}), "name"], "ITEM1 NAME")
  ```
  """

  defmacro __using__(_defaults) do
    quote do
      @behaviour Access
      defdelegate get(v, key, default), to: Map
      defdelegate fetch(v, key), to: Map
      defdelegate get_and_update(v, key, func), to: Map
      # ignore pop for structs
      def pop(v, key), do: {v[key], v}
    end
  end
end
