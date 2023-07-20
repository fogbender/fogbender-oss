defmodule Fog.RepoCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      alias Fog.{Repo, Data}

      import Ecto
      import Ecto.Query
      import Fog.RepoCase
      import Fog.RepoCaseUtils

      # and any other stuff
    end
  end

  setup tags do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Fog.Repo)

    unless tags[:async] do
      Ecto.Adapters.SQL.Sandbox.mode(Fog.Repo, {:shared, self()})
    end

    :ok
  end
end
