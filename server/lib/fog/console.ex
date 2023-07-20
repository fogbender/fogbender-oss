defmodule Console.Implementation do
  defmacro __using__(_opts) do
    quote do
      @not_set :this_parameter_was_NoT_set
      require Logger

      def f(args) do
        values = Enum.take_while(args, &(&1 != @not_set))
        values = Enum.map(values, &Kernel.inspect(&1, pretty: true))
        Enum.join(values, ", ")
      end

      def log(
            arg1 \\ @not_set,
            arg2 \\ @not_set,
            arg3 \\ @not_set,
            arg4 \\ @not_set,
            arg5 \\ @not_set,
            arg6 \\ @not_set,
            arg7 \\ @not_set,
            arg8 \\ @not_set,
            arg9 \\ @not_set,
            arg10 \\ @not_set,
            arg11 \\ @not_set,
            arg12 \\ @not_set
          ) do
        value = f([arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12])
        IO.puts(value)
        :ok
      end

      def error(
            arg1 \\ @not_set,
            arg2 \\ @not_set,
            arg3 \\ @not_set,
            arg4 \\ @not_set,
            arg5 \\ @not_set,
            arg6 \\ @not_set,
            arg7 \\ @not_set,
            arg8 \\ @not_set,
            arg9 \\ @not_set,
            arg10 \\ @not_set,
            arg11 \\ @not_set,
            arg12 \\ @not_set
          ) do
        value = f([arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12])
        Logger.error(value)
        :ok
      end
    end
  end
end

defmodule Console do
  use Console.Implementation
end

defmodule :console do
  use Console.Implementation
end
