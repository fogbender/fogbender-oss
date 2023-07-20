defmodule Fog.Repo do
  use Ecto.Repo,
    otp_app: :fog,
    adapter: Ecto.Adapters.Postgres

  require Ecto.Query

  def preload_for_param(entity, params, key) do
    case Keyword.has_key?(params, key) do
      true -> Fog.Repo.preload(entity, key)
      false -> entity
    end
  end

  def to_sql(query) do
    Fog.Repo.to_sql(:all, query)
  end

  def explain(query) do
    Fog.Repo.explain(:all, query, analyze: true)
  end

  defmacro sql_split_part(exp, sep, pos) do
    quote do
      fragment("split_part(?, ?, ?)", unquote(exp), unquote(sep), unquote(pos))
    end
  end

  defmacro sql_case(do: options, else: else_expr) do
    do_sql_case(do: options, else: else_expr)
  end

  defmacro sql_case(do: options) do
    do_sql_case(do: options, else: nil)
  end

  def do_sql_case(do: options, else: else_expr) do
    args =
      for {:->, _, [[condition], expr]} <- options do
        [condition, expr]
      end
      |> List.flatten()

    sql =
      "CASE\n" <>
        String.duplicate("WHEN ? THEN ?\n", div(length(args), 2)) <>
        "ELSE ? \n" <>
        "END"

    args = args ++ [else_expr]

    quote do
      fragment(unquote(sql), unquote_splicing(args))
    end
  end

  defmacro join_once(query, type \\ :inner, bindings, expr, opts) do
    name = opts[:as]

    if name == nil do
      raise ArgumentError, "join_once requries :as option"
    end

    quote do
      unquoted_query = unquote(query)

      if has_named_binding?(unquoted_query, unquote(name)) do
        unquoted_query
      else
        join(
          unquoted_query,
          unquote(type),
          unquote(bindings),
          unquote(expr),
          unquote(opts)
        )
      end
    end
  end

  defmacro sql_lower(expr) do
    quote do
      fragment("lower(?)", unquote(expr))
    end
  end

  defmacro concat(expr1, expr2) do
    quote do
      fragment("? || ?", unquote(expr1), unquote(expr2))
    end
  end
end
