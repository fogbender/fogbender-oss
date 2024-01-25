defmodule Fog.Api.Perm do
  @moduledoc """
  Casbin-like access control rule-based engine.
  Rules kept in api/perm/ directory. It should use Api.Perm and describe actions with parameters and deny/allow rules.

  ### Example

  ```
  defmodule Fog.Api.Perm.Test do
    use Fog.Api.Perm

    action :create, [:room_id]
    action :delete, [:workspace_id]

    deny :*, guest(s)
    allow :create, agent(s, r.room_id) or user(s, r.room_id)
    allow :delete, agent(s, r.workspace_id)
  end
  ```

  Now it is possible to call Fog.Api.Perm.Test.allowed?(session, :create, room_id: "r1234") with True|False result.

  ### Actions

  Action described by `action NAME, FIELDS` macro.

  ### Rules

  Rules described by `deny ACTION, PREDICATE` or `allow ACTION, PREDICATE` macroses.
  ACTION could be any previously defined action name or `:*` atom for any action.
  PREDICATE is expression that should result in Boolean. Expression has access to `s` and `r` variables - `s` is session provided to `allowed?` call
  and `r` keeps all additional action parameters provided to `allowed?` call.

  Current implementation searches for first rule with matched ACTION and positive PREDICATE.
  `allowed?` will result in true only if first matched rule is `allow`, in case of `deny` or no matching rules found it results in false.

  PREDICATE could use any external functions described in current module or from `Perm.Helpers` module, which is imported automatically.
  """

  alias Fog.Api.Session
  require Logger

  def check(sess, mod, action, data) do
    case allowed?(sess, mod, action, data) do
      true -> :allowed
      false -> :denied
    end
  end

  def allowed?(sess, mod, action, data) do
    case process_rules(sess, action, data, mod.rules()) do
      {:allow, _, _} ->
        true

      {:deny, mod, pred} ->
        Logger.warning(
          "DENY #{mod_name(mod)}/#{action} by #{pred} rule for #{session_info(sess)}. #{inspect(data)}"
        )

        false

      [] ->
        Logger.warning(
          "DENY #{mod_name(mod)}/#{action} by no allow rule found for #{session_info(sess)}. #{inspect(data)}"
        )

        false
    end
  end

  defp session_info(%Session.Agent{agentId: id}), do: "agent #{id}"
  defp session_info(%Session.User{userId: id}), do: "user #{id}"
  defp session_info(%Session.Guest{}), do: "guest"

  defp mod_name(mod), do: mod |> to_string() |> String.split(".") |> List.last()

  def process_rules(_, _, _, []), do: []

  def process_rules(subject, req_action, data, [{{mod, pred}, rule_action, effect} | rest])
      when rule_action == :* or rule_action == req_action do
    case {apply(mod, pred, [subject, data]), effect} do
      {false, _} -> process_rules(subject, req_action, data, rest)
      {true, effect} -> {effect, mod, pred}
    end
  end

  def process_rules(subject, action, data, [_ | rest]),
    do: process_rules(subject, action, data, rest)

  def add_rule(env, action, predicate, effect) do
    function_name = "#{effect}_#{action}_#{env.line}" |> String.to_atom()

    quote do
      @rules @rules ++ [{{__MODULE__, unquote(function_name)}, unquote(action), unquote(effect)}]
      def unquote(function_name)(var!(s), var!(r)) do
        _ = var!(s)
        _ = var!(r)
        unquote(predicate)
      end
    end
  end

  defmacro action(name, params) do
    quote do
      action_params = for(p <- unquote(params), do: {p, nil}) |> Map.new()
      @actions @actions ++ [{unquote(name), unquote(params)}]
      @params Map.merge(@params, action_params)
    end
  end

  defmacro allow(action, predicate), do: add_rule(__CALLER__, action, predicate, :allow)
  defmacro allow(action), do: add_rule(__CALLER__, action, true, :allow)

  defmacro deny(action, predicate), do: add_rule(__CALLER__, action, predicate, :deny)
  defmacro deny(action), do: add_rule(__CALLER__, action, true, :deny)

  @doc false
  defmacro __using__(_opts) do
    quote do
      alias Fog.Api.Perm
      import Fog.Api.Perm
      import Fog.Api.Perm.Helpers

      @rules []
      @actions []
      @params %{}

      def test, do: __MODULE__

      def allowed?(sess, action, params),
        do: Fog.Api.Perm.allowed?(sess, __MODULE__, action, request(action, params))

      def check(sess, action, params),
        do: Fog.Api.Perm.check(sess, __MODULE__, action, request(action, params))

      defp request(_action, params) do
        Map.merge(default_params(), Map.new(params))
      end

      @before_compile Fog.Api.Perm
    end
  end

  @doc false
  defmacro __before_compile__(_env) do
    quote do
      def rules do
        Enum.to_list(@rules)
      end

      def actions do
        Enum.to_list(@actions)
      end

      def default_params do
        @params
      end
    end
  end
end
