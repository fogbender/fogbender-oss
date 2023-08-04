defmodule Test.GroupedList do
  use ExUnit.Case
  alias Fog.GroupedList

  test "insert item with multiple groups" do
    gl =
      GroupedList.new()
      |> GroupedList.insert_group("GROUP1", %{name: "GROUP1 NAME", id: "GROUP1"})
      |> GroupedList.insert_group("GROUP2", %{name: "GROUP2 NAME", id: "GROUP2"})
      |> GroupedList.insert_item(
        "r1",
        %{
          "GROUP1" => %{count: 1, unread: 1, order: 100},
          "GROUP2" => %{count: 1, unread: 1, mentioned: 1, order: 10}
        }
      )

    assert [
             {:group, "GROUP1", %{name: "GROUP1 NAME"}, %{count: 1}},
             {:group, "GROUP2", %{name: "GROUP2 NAME"}, %{count: 1}},
             {:item, "r1", _}
           ] = GroupedList.get_updated(gl)

    assert {:group, "GROUP1", _, %{count: 1, unread: 1}} = GroupedList.get_group(gl, "GROUP1")

    assert {:group, "GROUP2", _, %{count: 1, unread: 1, mentioned: 1}} =
             GroupedList.get_group(gl, "GROUP2")

    assert {:item, "r1", %{"GROUP1" => 1, "GROUP2" => 1}} = GroupedList.get_item(gl, "r1")
  end

  test "insert multiple items" do
    gl =
      GroupedList.new()
      |> GroupedList.insert_item(
        "r1",
        %{
          "GROUP1" => %{count: 1, unread: 1, order: 100},
          "GROUP2" => %{count: 1, unread: 1, mentioned: 1, order: 10}
        }
      )
      |> GroupedList.insert_item(
        "r2",
        %{
          "GROUP1" => %{count: 1, order: 50},
          "GROUP2" => %{count: 1, unread: 1, order: 20}
        }
      )

    assert [
             {:group, "GROUP1", _, _},
             {:group, "GROUP2", _, _},
             {:item, "r1", _},
             {:item, "r2", _}
           ] = GroupedList.get_updated(gl)

    assert {:group, "GROUP1", _, %{count: 2, unread: 1}} = GroupedList.get_group(gl, "GROUP1")

    assert {:group, "GROUP2", _, %{count: 2, unread: 2, mentioned: 1}} =
             GroupedList.get_group(gl, "GROUP2")

    assert {:item, "r1", %{"GROUP1" => 2, "GROUP2" => 1}} = GroupedList.get_item(gl, "r1")

    assert {:item, "r2", %{"GROUP1" => 1, "GROUP2" => 2}} = GroupedList.get_item(gl, "r2")
  end

  test "don't show group in updated without changes" do
    gl =
      GroupedList.new()
      |> GroupedList.insert_group("G1", %{id: "G1", name: "G1 name"})

    assert {[{:group, "G1", _, _}], gl} = GroupedList.flush_updated(gl)

    gl = GroupedList.insert_group(gl, "G1", %{id: "G1", name: "G1 name"})
    assert [] = GroupedList.get_updated(gl)

    gl = GroupedList.insert_group(gl, "G1", %{id: "G1", name: "G1 name new"})
    assert [{:group, "G1", %{name: "G1 name new"}, _}] = GroupedList.get_updated(gl)
  end

  test "removed item placed in updates" do
    gl =
      GroupedList.new()
      |> GroupedList.insert_group("G1", %{id: "G1", name: "G1 name"})
      |> GroupedList.insert_item("I1", %{"G1" => %{count: 1, order: 1}})

    assert {[
              {:group, "G1", _, %{count: 1}},
              {:item, "I1", _}
            ], gl} = GroupedList.flush_updated(gl)

    assert [
             {:group, "G1", _, %{count: 0}},
             {:item, "I1", %{}}
           ] =
             gl
             |> GroupedList.remove("I1")
             |> GroupedList.get_updated()
  end
end
