defmodule Fog.Types.Snowflake do
  @moduledoc """
  A custom Ecto type to generate Snowflake IDs.
  Uses string representation in Elixir and bigint in database.
  It is possible to create new Snowflake based type with prefixes:

     defmodule Fog.Types.New, do: use Fog.Types.Snowflake, "prefix"

  """
  use Ecto.Type
  require Logger

  @width 20

  @type t :: binary()

  @doc """
  Generates a new raw ID.
  """
  @spec rawid() :: integer()
  def rawid do
    {:ok, id} = Snowflake.next_id()
    id
  rescue
    exception ->
      Logger.error("Ecto type Snowflake failed: #{inspect(exception)} #{__STACKTRACE__}")
      reraise(exception, __STACKTRACE__)
  end

  @doc """
  Generates a new ID.
  """
  @spec generate() :: t()
  def generate do
    {:ok, id} = rawid() |> cast()
    id
  end

  def autogenerate, do: generate()

  def type, do: :integer

  def cast(term) when is_integer(term), do: {:ok, id_to_string(term)}
  def cast(term) when is_binary(term), do: {:ok, term}
  def cast(_), do: :error

  def load(term), do: cast(term)

  def dump(term) when is_binary(term), do: {:ok, String.to_integer(term)}
  def dump(term) when is_integer(term), do: {:ok, term}
  def dump(_), do: :error

  defmacro __using__(prefix) do
    quote do
      use Ecto.Type
      alias Fog.Types.Snowflake

      def generate do
        {:ok, id} = Snowflake.rawid() |> cast()
        id
      end

      def autogenerate, do: generate()

      def type, do: Snowflake.type()

      def cast(unquote(prefix) <> _ = term) when is_binary(term), do: {:ok, term}

      def cast(term) when is_integer(term),
        do: {:ok, unquote(prefix) <> Snowflake.id_to_string(term)}

      def cast(_), do: :error

      def load(term), do: cast(term)

      def dump(unquote(prefix) <> id), do: {:ok, String.to_integer(id)}
      def dump(id) when is_integer(id), do: {:ok, id}
      def dump(_), do: :error

      def dump!(id) do
        {:ok, res} = dump(id)
        res
      end
    end
  end

  def id_to_string(id) do
    :io_lib.format("~#{@width}..0B", [id])
    |> to_string()
  end
end

defmodule Fog.Types.DetectiveId, do: use(Fog.Types.Snowflake, "d")
defmodule Fog.Types.AgentId, do: use(Fog.Types.Snowflake, "a")
defmodule Fog.Types.VendorId, do: use(Fog.Types.Snowflake, "v")
defmodule Fog.Types.CustomerId, do: use(Fog.Types.Snowflake, "c")
defmodule Fog.Types.UserId, do: use(Fog.Types.Snowflake, "u")
defmodule Fog.Types.WorkspaceId, do: use(Fog.Types.Snowflake, "w")
defmodule Fog.Types.HelpdeskId, do: use(Fog.Types.Snowflake, "h")
defmodule Fog.Types.InviteId, do: use(Fog.Types.Snowflake, "i")
defmodule Fog.Types.RoomId, do: use(Fog.Types.Snowflake, "r")
defmodule Fog.Types.MessageId, do: use(Fog.Types.Snowflake, "m")
defmodule Fog.Types.UserEventId, do: use(Fog.Types.Snowflake, "e")
defmodule Fog.Types.FileId, do: use(Fog.Types.Snowflake, "f")
defmodule Fog.Types.TagId, do: use(Fog.Types.Snowflake, "t")
defmodule Fog.Types.FoginviteId, do: use(Fog.Types.Snowflake, "fi")
