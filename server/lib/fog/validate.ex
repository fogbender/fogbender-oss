defmodule Fog.Validate do
  @moduledoc false

  # from https://github.com/jshmrtn/email_checker/blob/master/lib/email_checker/tools.ex
  @email_regex ~r/^(?<user>[^\s]+)@(?<domain>[^\s]+\.[^\s]+)$/

  def valid?(email) do
    email =~ @email_regex
  end
end
