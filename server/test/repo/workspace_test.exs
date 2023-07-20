defmodule Test.Repo.Workspace do
  use Fog.RepoCase, async: true
  alias Fog.{Repo, Data}

  describe "resolve_rooms" do
    test "resolve all customer rooms" do
      v = vendor()
      a = agent(v)
      a2 = agent(v)
      w1 = workspace(v)
      w2 = workspace(v)
      hi = internal_helpdesk(w1)
      h1 = helpdesk(w1)
      h2 = helpdesk(w2)
      r11 = public_room(h1)
      r12 = public_room(h1)
      p1 = private_room(h1, [a])
      d1 = dialog_room(h1, [a, a2])
      i1 = public_room(hi)
      r21 = public_room(h2)

      assert {4, nil} = Repo.Workspace.resolve_rooms(w1.id, a.id)

      assert [
               {r11.id, true, a.id},
               {r12.id, true, a.id},
               {p1.id, true, a.id},
               {d1.id, true, a.id},
               {i1.id, false, nil},
               {r21.id, false, nil}
             ] ==
               from(r in Data.Room,
                 order_by: r.id,
                 select: {r.id, r.resolved, r.resolved_by_agent_id}
               )
               |> Repo.all()
    end
  end
end
