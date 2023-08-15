defmodule Test.Api.PermTest do
  alias Fog.Api.Session
  use Fog.ApiCase
  import ExUnit.CaptureLog

  defmodule Fake do
    use Fog.Api.Perm

    action(:create, [:par1, :par2])
    action(:update, [:par1, :par2])

    deny(:*, r.par1 == false)
    allow(:create, r.par2 == :create)
    allow(:update, r.par2 == :update)
  end

  setup do
    [s: Session.guest()]
  end

  describe "Perm basic rules processing" do
    @tag capture_log: true
    test "reject on first deny rule", %{s: s} do
      assert :denied = Fake.check(s, :create, par1: false, par2: :create)

      assert capture_log(fn ->
               assert false == Fake.allowed?(s, :create, par1: false, par2: :create)
             end) =~
               ~r".*[warnin].*DENY Fake/create by deny_\*_12 rule for guest\. %{par1: false, par2: :create}.*"
    end

    test "allow on first valid allow rule", %{s: s} do
      assert :allowed = Fake.check(s, :update, par1: true, par2: :update)
      assert true == Fake.allowed?(s, :update, par1: true, par2: :update)
    end

    @tag capture_log: true
    test "deny if no valid allow rules", %{s: s} do
      assert :denied = Fake.check(s, :update, par1: true, par2: :create)

      assert capture_log(fn ->
               assert false == Fake.allowed?(s, :update, par1: true, par2: :create)
             end) =~
               ~r".*[warn].*DENY Fake/update by no allow rule found for guest\. %{par1: true, par2: :create}.*"
    end
  end
end
