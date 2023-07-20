defmodule Fog.Repo.Tools do
  @moduledoc "Helper functions for repl and debug"

  def last(query) do
    Fog.Repo.all(query) |> List.last()
  end

  def to_sql(query) do
    Fog.Repo.to_sql(:all, query)
  end
end
