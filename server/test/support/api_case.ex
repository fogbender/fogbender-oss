defmodule Fog.ApiCase do
  use ExUnit.CaseTemplate

  using do
    quote do
      import Fog.ApiCase
      import Fog.ApiCaseUtils
    end
  end
end
