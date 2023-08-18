defmodule Fog.Api.Handler do
  @reserved [:msgType, :msgId, :code, :error]

  defmacro __using__(_opts) do
    quote do
      require Fog.Api.Handler
      import Fog.Api.Handler, only: [defmsg: 2, defmsg: 1, deferr: 2, deferr: 1]
    end
  end

  defmacro defmsg(name, fields \\ []) do
    check_reserved(fields)

    quote do
      defmodule unquote(name), do: defstruct([:msgId, :msgType | unquote(fields)])
    end
  end

  defmacro deferr(name, fields \\ []) do
    check_reserved(fields)

    quote do
      defmodule unquote(name) do
        defstruct([:msgId, :msgType, :code, :error | unquote(fields)])

        def invalid_request(params \\ []), do: mk_error(400, "Invalid request", params)
        def not_authorized(params \\ []), do: mk_error(401, "Not Authorized", params)
        def forbidden(params \\ []), do: mk_error(403, "Forbidden", params)
        def not_found(params \\ []), do: mk_error(404, "Not found", params)
        def conflict(params \\ []), do: mk_error(409, "Conflict", params)
        def internal(params \\ []), do: mk_error(500, "Internal server error", params)
        def not_implemented(params \\ []), do: mk_error(501, "Not implemented", params)
        def rate_limited(params \\ []), do: mk_error(429, "Too many requests", params)

        defp mk_error(code, error, params) do
          message = %{struct(__MODULE__) | code: code, error: error}
          Enum.reduce(params, message, fn {k, v}, m -> Map.replace!(m, k, v) end)
        end
      end
    end
  end

  def check_reserved(fields) do
    unless fields -- @reserved == fields do
      IO.warn("#{@reserved} fields are reserved for internal use", Macro.Env.stacktrace(__ENV__))
    end
  end
end
