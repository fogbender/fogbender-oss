defmodule Test.Repo.FeatureOption do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils

  setup do
    v1 = vendor()
    w1 = workspace(v1)
    w2 = workspace(v1)
    a1 = agent(w1)
    h1 = helpdesk(w1)
    u1 = user(h1)
    Kernel.binding()
  end

  describe "FeatureOption for vendor" do
    test "return default values if not set", ctx do
      assert %Data.FeatureOption{
               tag_scope_enabled: false,
               email_digest_enabled: false,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.v1)
    end

    test "use vendor value if set", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true, email_digest_enabled: true)

      assert %Data.FeatureOption{
               tag_scope_enabled: true,
               email_digest_enabled: true,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.v1)
    end

    test "respect global vendor value", ctx do
      Repo.FeatureOption.vendor_defaults(email_digest_period: 100)
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: true)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.v1)
    end
  end

  describe "FeatureOption for workspace" do
    test "return default values if not set", ctx do
      assert %Data.FeatureOption{
               tag_scope_enabled: false,
               email_digest_enabled: false,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.w1)
    end

    test "use vendor or workspace value", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.w1, email_digest_enabled: true)

      assert %Data.FeatureOption{
               tag_scope_enabled: true,
               email_digest_enabled: true,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.w1)
    end

    test "respect workspace value over vendor", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.w1, tag_scope_enabled: false)

      assert %Data.FeatureOption{
               tag_scope_enabled: false
             } = Repo.FeatureOption.get(ctx.w1)
    end

    test "respect global vendor value", ctx do
      Repo.FeatureOption.vendor_defaults(email_digest_period: 100)
      Repo.FeatureOption.set(ctx.w1, email_digest_enabled: true)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.w1)
    end
  end

  describe "FeatureOption for user" do
    test "return default values if not set", ctx do
      assert %Data.FeatureOption{
               tag_scope_enabled: false,
               email_digest_enabled: false,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.u1)
    end

    test "use vendor or workspace or user value", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.w1, email_digest_enabled: true)
      Repo.FeatureOption.set(ctx.u1, email_digest_period: 100)

      assert %Data.FeatureOption{
               tag_scope_enabled: true,
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.u1)
    end

    test "respect user value over vendor or workspace", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.w1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.u1, tag_scope_enabled: false)

      assert %Data.FeatureOption{
               tag_scope_enabled: false
             } = Repo.FeatureOption.get(ctx.u1)
    end

    test "respect global vendor or user value", ctx do
      Repo.FeatureOption.vendor_defaults(email_digest_period: 100)
      Repo.FeatureOption.set(ctx.v1, email_digest_enabled: true)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.u1)

      Repo.FeatureOption.user_defaults(email_digest_period: 1000)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 1000
             } = Repo.FeatureOption.get(ctx.u1)
    end
  end

  describe "FeatureOption for agent" do
    test "return default values if not set", ctx do
      assert %Data.FeatureOption{
               tag_scope_enabled: false,
               email_digest_enabled: false,
               email_digest_period: 86400
             } = Repo.FeatureOption.get(ctx.v1, ctx.w1, ctx.a1)
    end

    test "use vendor or workspace or agent value", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.a1, email_digest_enabled: true)
      Repo.FeatureOption.set(ctx.w1, email_digest_period: 100)

      assert %Data.FeatureOption{
               tag_scope_enabled: true,
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.v1, ctx.w1, ctx.a1)
    end

    test "respect agent value over vendor and workspace", ctx do
      Repo.FeatureOption.set(ctx.v1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.w1, tag_scope_enabled: true)
      Repo.FeatureOption.set(ctx.a1, tag_scope_enabled: false)

      assert %Data.FeatureOption{
               tag_scope_enabled: false
             } = Repo.FeatureOption.get(ctx.v1, ctx.w1, ctx.a1)
    end

    test "respect global vendor or agent value", ctx do
      Repo.FeatureOption.vendor_defaults(email_digest_period: 100)
      Repo.FeatureOption.set(ctx.a1, email_digest_enabled: true)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 100
             } = Repo.FeatureOption.get(ctx.v1, ctx.w1, ctx.a1)

      Repo.FeatureOption.agent_defaults(email_digest_period: 1000)

      assert %Data.FeatureOption{
               email_digest_enabled: true,
               email_digest_period: 1000
             } = Repo.FeatureOption.get(ctx.v1, ctx.w1, ctx.a1)
    end
  end
end
