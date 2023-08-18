defmodule Test.Service.ImportUsersTest do
  use Fog.RepoCase, async: true
  import Fog.RepoCaseUtils
  alias Fog.{Repo, Data}

  @ws1 %{name: "WS1", signature_type: "test", signature_secret: "test"}
  @ws2 %{name: "WS2", signature_type: "test", signature_secret: "test"}
  @vendor_with_ws %{name: "VENDOR 1", workspaces: [@ws1, @ws2]}

  defp csv(cid, uid) do
    %Data.ImportUser{
      customer_id: "cex#{cid}",
      customer_name: "cname#{cid}",
      user_id: "uex#{uid}",
      user_name: "uname#{uid}",
      user_email: "umail#{uid}@example.com",
      user_picture: "https://example.com/#{uid}.jpg"
    }
  end

  defp csv(cid) do
    %Data.ImportUser{
      customer_id: "cex#{cid}",
      customer_name: "cname#{cid}"
    }
  end

  defp insert_vendor!(params) do
    Data.Vendor.new(params)
    |> Repo.insert!()
  end

  describe "ImportUsers" do
    test "creates new customer" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1), csv(1, 2)], vendor.id, ws.id)

      assert %Data.Customer{} = Repo.get_by(Data.Customer, external_uid: "cex1")
      assert [_, _] = Repo.all(Data.User)
    end

    test "creates new helpdesk without triage" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], vendor.id, ws.id, false)

      assert %Data.Customer{id: customer_id} = Repo.get_by(Data.Customer, external_uid: "cex3")

      assert %Data.Helpdesk{triage: nil} =
               Repo.get_by(Data.Helpdesk, customer_id: customer_id) |> Repo.preload(:triage)
    end

    test "updates old customer" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1), csv(1, 2)], vendor.id, ws.id)
      csv2 = %{csv(1, 3) | customer_name: "UPDATED NAME"}
      Fog.Service.ImportUsers.import([csv2], vendor.id, ws.id)

      assert %Data.Customer{name: "UPDATED NAME"} =
               Repo.get_by(Data.Customer, external_uid: "cex1")
    end

    test "keeps old customer if not updated" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1), csv(1, 2)], vendor.id, ws.id)
      old_cs = Repo.get_by(Data.Customer, external_uid: "cex1")
      csv2 = csv(2, 1)
      Fog.Service.ImportUsers.import([csv2], vendor.id, ws.id)

      assert %Data.Customer{external_uid: "cex1", name: "cname1"} =
               Repo.get(Data.Customer, old_cs.id)

      assert [_, _, _] = Repo.all(Data.User)
    end

    test "updates old user with nil avatar" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1)], vendor.id, ws.id)

      csv2 = %{
        csv(1, 1)
        | user_name: "UPDATED NAME",
          user_email: "updated@example.com",
          user_picture: nil
      }

      old_user_picture = csv(1, 1).user_picture

      Fog.Service.ImportUsers.import([csv2], vendor.id, ws.id)

      assert [
               %Fog.Data.User{
                 external_uid: "uex1",
                 name: "UPDATED NAME",
                 email: "updated@example.com",
                 image_url: ^old_user_picture
               }
             ] = Repo.all(Data.User)
    end

    test "updates old user with new avatar" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1)], vendor.id, ws.id)

      csv2 = %{
        csv(1, 1)
        | user_name: "UPDATED NAME",
          user_email: "updated@example.com",
          user_picture: "https://updated/picture"
      }

      Fog.Service.ImportUsers.import([csv2], vendor.id, ws.id)

      assert [
               %Fog.Data.User{
                 external_uid: "uex1",
                 name: "UPDATED NAME",
                 email: "updated@example.com",
                 image_url: "https://updated/picture"
               }
             ] = Repo.all(Data.User)
    end

    test "updates old user: same email, different external_uid" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(1, 1)], vendor.id, ws.id)

      csv2 = %{
        csv(1, 1)
        | user_name: "UPDATED NAME",
          user_id: "updated_uex1",
          user_picture: nil
      }

      old_user_picture = csv(1, 1).user_picture

      Fog.Service.ImportUsers.import([csv2], vendor.id, ws.id)

      assert [
               %Fog.Data.User{
                 external_uid: "updated_uex1",
                 name: "UPDATED NAME",
                 email: "umail1@example.com",
                 image_url: ^old_user_picture
               }
             ] = Repo.all(Data.User)
    end

    test "reimport deleted user" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      a1 = agent(ws)

      Fog.Service.ImportUsers.import([csv(1, 1)], vendor.id, ws.id)

      [u1] = Repo.all(Data.User)
      delete_user(u1.id, a1.id)
      [u1] = Repo.all(Data.User)

      assert not is_nil(u1.deleted_at)
      assert u1.deleted_by_agent_id === a1.id

      Fog.Service.ImportUsers.import([csv(1, 1)], vendor.id, ws.id)

      [u1] = Repo.all(Data.User)

      assert is_nil(u1.deleted_at)
      assert is_nil(u1.deleted_by_agent_id)
    end

    test "uses workspace.triage_name for new triage room" do
      v1 = vendor()
      w1 = workspace(v1)
      Data.Workspace.update(w1, triage_name: "SUPPORT") |> Repo.update!()
      Fog.Service.ImportUsers.import([csv(1, 1)], v1.id, w1.id)

      assert [
               %Data.Room{is_triage: true, name: "SUPPORT"}
             ] = Repo.all(Data.Room)
    end

    test "new triage has :triage tag" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces
      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], vendor.id, ws.id)

      %Data.Customer{id: customer_id} = Repo.get_by(Data.Customer, external_uid: "cex3")

      helpdesk =
        Repo.get_by(Data.Helpdesk, customer_id: customer_id) |> Repo.preload(triage: :tags)

      triage_tag = Repo.Tag.create(ws.id, ":triage")

      assert [%Data.RoomTag{tag_id: triage_tag_id}] = helpdesk.triage.tags
      assert triage_tag_id === triage_tag.id
    end

    test "old triage has non-:triage tag" do
      vendor = insert_vendor!(@vendor_with_ws)
      [ws | _] = vendor.workspaces

      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], vendor.id, ws.id)
      %Data.Customer{id: customer_id} = Repo.get_by(Data.Customer, external_uid: "cex3")

      helpdesk =
        Repo.get_by(Data.Helpdesk, customer_id: customer_id) |> Repo.preload(triage: :tags)

      triage_tag = Repo.Tag.create(ws.id, ":triage")
      t0_tag = Repo.Tag.create(ws.id, ":t0")

      %Data.Room{} = Repo.Room.update_tags(helpdesk.triage.id, [t0_tag.id], [], nil, nil)

      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], vendor.id, ws.id)
      %Data.Customer{id: customer_id} = Repo.get_by(Data.Customer, external_uid: "cex3")

      helpdesk =
        Repo.get_by(Data.Helpdesk, customer_id: customer_id) |> Repo.preload(triage: :tags)

      assert %Data.RoomTag{} = helpdesk.triage.tags |> Enum.find(&(&1.tag_id === triage_tag.id))
      assert %Data.RoomTag{} = helpdesk.triage.tags |> Enum.find(&(&1.tag_id === t0_tag.id))
    end

    test "import into existing helpdesk shouldn't recreate room_tag entry" do
      v = vendor()
      ws = workspace(v)
      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], v.id, ws.id)
      rt = Data.RoomTag |> Repo.one() |> Repo.preload(:tag)

      Fog.Service.ImportUsers.import([csv(3, 1), csv(3, 2)], v.id, ws.id)
      rt2 = Data.RoomTag |> Repo.one() |> Repo.preload(:tag)

      assert rt == rt2
    end
  end

  describe "Import customers without users" do
    setup do
      vendor = vendor()
      ws = workspace(vendor)
      csv = [csv(1), csv(2)]
      Fog.Service.ImportUsers.import(csv, vendor.id, ws.id)
      Kernel.binding()
    end

    test "creates new customer with helpdesk and triage" do
      assert %Data.Customer{helpdesks: [helpdesk]} =
               Repo.get_by(Data.Customer, external_uid: "cex1")
               |> Repo.preload(helpdesks: [:users, triage: [tags: :tag]])

      assert %Data.Helpdesk{
               triage: %Data.Room{name: "Triage", is_triage: true, tags: [tag]},
               users: []
             } = helpdesk

      assert %Data.RoomTag{tag: %Data.Tag{name: ":triage"}} = tag
      assert %Data.Customer{} = Repo.get_by(Data.Customer, external_uid: "cex2")
    end

    test "updates old customer", ctx do
      csv2 = %{csv(1) | customer_name: "UPDATED NAME"}
      Fog.Service.ImportUsers.import([csv2], ctx.vendor.id, ctx.ws.id)

      assert %Data.Customer{name: "UPDATED NAME"} =
               Repo.get_by(Data.Customer, external_uid: "cex1")

      assert %Data.Customer{name: "cname2"} = Repo.get_by(Data.Customer, external_uid: "cex2")
    end
  end

  describe "Assigns default group" do
    setup do
      Repo.FeatureOption.vendor_defaults(default_group_assignment: "g1")

      vendor = vendor()
      ws = workspace(vendor)
      csv = [csv(1), csv(2)]
      Fog.Service.ImportUsers.import(csv, vendor.id, ws.id)
      Kernel.binding()
    end

    test "Triage has default group assignment" do
      assert %Data.Customer{helpdesks: [%Data.Helpdesk{triage: triage}]} =
               Repo.get_by(Data.Customer, external_uid: "cex1")
               |> Repo.preload(helpdesks: [:users, triage: [tags: :tag]])

      assert true ===
               triage.tags |> Enum.find_value(&(&1.tag.name === ":assignee:group:g1" and true))
    end
  end
end
