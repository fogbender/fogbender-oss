defmodule Test.Repo.VendorApiToken do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  alias Fog.{Repo, Data}

  setup do
    v = vendor()
    a = agent(v)
    Kernel.binding()
  end

  describe "vendor API token" do
    test "create", ctx do
      {vid, aid} = {ctx.v.id, ctx.a.id}
      t = Repo.VendorApiToken.create(vid, aid, ["customer:update"])

      assert {:ok,
              %Data.VendorApiToken{
                vendor_id: ^vid,
                created_by_agent_id: ^aid,
                scopes: ["customer:update"]
              }} = Repo.VendorApiToken.check(t)
    end

    test "delete", ctx do
      {vid, aid} = {ctx.v.id, ctx.a.id}
      t = Repo.VendorApiToken.create(vid, aid, ["customer:update"])
      {:ok, %Data.VendorApiToken{id: token_id}} = Repo.VendorApiToken.check(t)
      :ok = Repo.VendorApiToken.mark_deleted(vid, aid, token_id)
      assert {:error, :invalid} = Repo.VendorApiToken.check(t)
    end
  end
end
