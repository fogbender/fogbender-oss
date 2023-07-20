defmodule Test.Repo.Tag do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  setup do
    v = vendor()
    w = workspace(v)
    h = helpdesk(w)
    ha = internal_helpdesk(w)
    r1 = public_room(h, "R1")
    r2 = public_room(h, "R2")
    r3 = public_room(ha, "R3")
    r4 = public_room(ha, "R4")

    tag1 = tag(w, "#tag1")
    tag2 = tag(w, "#tag2")

    tag(r1, tag1)
    tag(r3, tag1)
    Kernel.binding()
  end

  test "return tagged entities", ctx do
    assert [%Data.Room{name: "R1"}, %Data.Room{name: "R3"}] =
             Repo.Tag.get_tagged(ctx.w.id, "#tag1")

    assert [] = Repo.Tag.get_tagged(ctx.w.id, "#tag3")
  end
end
