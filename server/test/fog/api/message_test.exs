defmodule Test.Api.MessageTest do
  use Fog.RepoCase, async: true
  use Fog.ApiCase

  alias Fog.Api

  setup do
    vendor = vendor()
    workspace = workspace(vendor)
    agent = agent(workspace)
    agent2 = agent(workspace)

    agent_api =
      Api.Session.for_agent(vendor.id, agent.id)
      |> Api.init()

    ha = helpdesk(workspace, true)
    h1 = helpdesk(workspace)

    [user, u12, u13] = users(3, h1)

    user_api =
      Api.Session.for_user(vendor.id, h1.id, user.id)
      |> Api.init()

    [a1, a2, a3] = agents(3, workspace)

    agent_room = public_room(ha)
    user_room = public_room(h1)

    Kernel.binding()
  end

  describe "message with mentions" do
    setup ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "TEST @USER 1 and @AGENT 1",
        mentions: [
          %Api.Message.Mention{id: ctx.user.id, text: "USER 1"},
          %Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}
        ]
      }

      assert {:reply, %Api.Message.Ok{messageId: message_id}, _} = Api.request(msg, ctx.user_api)

      int_msg = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        text: "TEST @Agent 1 and @Agent 2",
        mentions: [
          %Api.Message.Mention{id: ctx.agent.id, text: "Agent 1"},
          %Api.Message.Mention{id: ctx.agent2.id, text: "Agent 2"}
        ]
      }

      assert {:reply, %Api.Message.Ok{messageId: int_message_id}, _} =
               Api.request(int_msg, ctx.agent_api)

      [message_id: message_id, int_message_id: int_message_id]
    end

    test "create", ctx do
      assert [%Api.Event.Message{mentions: mentions}] = load(ctx.user_api, ctx.user_room)

      assert [{ctx.agent.id, "AGENT 1"}, {ctx.user.id, "USER 1"}] ==
               mentions
               |> Enum.map(&{&1.id, &1.text})
               |> Enum.sort()
    end

    test "update", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: "TEST 2 @AGENT 1 and @USER 12",
        mentions: [
          %Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"},
          %Api.Message.Mention{id: ctx.u12.id, text: "USER 12"}
        ]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{mentions: mentions, rawText: raw}] =
               load(ctx.user_api, ctx.user_room)

      assert [{ctx.agent.id, "AGENT 1"}, {ctx.u12.id, "USER 12"}] ==
               mentions
               |> Enum.map(&{&1.id, &1.text})
               |> Enum.sort()

      assert "TEST 2 @AGENT 1 and @USER 12" == raw
    end

    test "empty mentions on virtual delete", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)
      assert [%Api.Event.Message{mentions: [], rawText: raw}] = load(ctx.user_api, ctx.user_room)
      assert raw == "Deleted by #{ctx.user.name}"

      int_msg = %Api.Message.Update{
        messageId: ctx.int_message_id
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(int_msg, ctx.agent_api)

      assert [%Api.Event.Message{mentions: [], rawText: raw}] =
               load(ctx.agent_api, ctx.agent_room)

      assert raw == "Deleted by #{ctx.agent.name}"
    end

    test "visualize mentions by provided text", ctx do
      assert [%Api.Event.Message{text: text}] = load(ctx.user_api, ctx.user_room)

      assert text ==
               "<p>TEST <b class=\"mention\">@USER 1</b> and <b class=\"mention\">@AGENT 1</b></p>"
    end

    test "visualize mentions in case of overlapped names", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: "TEST @Ivan Petrov and @Ivan Petrov Vodkin also @Ivan Petrov some text",
        mentions: [
          %Api.Message.Mention{id: ctx.agent.id, text: "Ivan Petrov"},
          %Api.Message.Mention{id: ctx.u12.id, text: "Ivan Petrov Vodkin"}
        ]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{text: text}] = load(ctx.user_api, ctx.user_room)

      assert text ==
               "<p>TEST <b class=\"mention\">@Ivan Petrov</b> and <b class=\"mention\">@Ivan Petrov Vodkin</b> also <b class=\"mention\">@Ivan Petrov</b> some text</p>"
    end

    test "visualize mentions in case of added emails", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text:
          "TEST @Ivan Petrov (ivanp@gmail.com) and @Ivan Petrov (ivanp@mail.ru) also @Ivan Petrov (ivanp@gmail.com) some text",
        mentions: [
          %Api.Message.Mention{id: ctx.agent.id, text: "Ivan Petrov (ivanp@gmail.com)"},
          %Api.Message.Mention{id: ctx.u12.id, text: "Ivan Petrov (ivanp@mail.ru)"}
        ]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{text: text}] = load(ctx.user_api, ctx.user_room)

      assert text ==
               "<p>TEST <b class=\"mention\">@Ivan Petrov (ivanp@gmail.com)</b> and <b class=\"mention\">@Ivan Petrov (ivanp@mail.ru)</b> also <b class=\"mention\">@Ivan Petrov (ivanp@gmail.com)</b> some text</p>"
    end

    test "forward", ctx do
      req = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        linkRoomId: ctx.user_room.id,
        linkStartMessageId: ctx.message_id,
        linkEndMessageId: ctx.message_id,
        linkType: "forward",
        text: "Forwarded"
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)
    end
  end

  describe "ignore mentions that are not presented in text" do
    setup ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "TEST @USER 1 and no agent",
        mentions: [
          %Api.Message.Mention{id: ctx.user.id, text: "USER 1"},
          %Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}
        ]
      }

      assert {:reply, %Api.Message.Ok{messageId: message_id}, _} = Api.request(msg, ctx.user_api)

      [message_id: message_id]
    end

    test "on create", ctx do
      assert [%Api.Event.Message{mentions: mentions}] = load(ctx.user_api, ctx.user_room)
      assert [%{id: ctx.user.id, name: ctx.user.name, text: "USER 1", type: "user"}] == mentions
    end

    test "on update", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: "TEST 2 @AGENT 1 and no user",
        mentions: [
          %Api.Message.Mention{id: ctx.user.id, text: "USER 1"},
          %Api.Message.Mention{id: ctx.agent.id, text: "AGENT 1"}
        ]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{mentions: mentions}] = load(ctx.user_api, ctx.user_room)

      assert [{ctx.agent.id, "AGENT 1"}] == Enum.map(mentions, &{&1.id, &1.text})
    end

    test "ignore overlapped mention texts", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: "TEST 2 @AGENT1 and @USER12",
        mentions: [
          %Api.Message.Mention{id: ctx.user.id, text: "USER1"},
          %Api.Message.Mention{id: ctx.agent.id, text: "AGENT1"},
          %Api.Message.Mention{id: ctx.u12.id, text: "USER12"}
        ]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{mentions: mentions}] = load(ctx.user_api, ctx.user_room)

      assert [{ctx.agent.id, "AGENT1"}, {ctx.u12.id, "USER12"}] ==
               Enum.map(mentions, &{&1.id, &1.text})
               |> Enum.sort()
    end
  end

  describe "message can't be created" do
    test "with nil text", ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: nil
      }

      assert {:reply, %Fog.Api.Message.Err{code: 400, error: "text is required"}, _} =
               Api.request(msg, ctx.user_api)
    end

    test "with empty string", ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: ""
      }

      assert {:reply, %Fog.Api.Message.Err{code: 400, error: "text is required"}, _} =
               Api.request(msg, ctx.user_api)
    end
  end

  describe "message can't be updated" do
    test "with empty string", ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "some text"
      }

      assert {:reply, %Fog.Api.Message.Ok{messageId: message_id}, _} =
               Api.request(msg, ctx.user_api)

      req = %Api.Message.Update{
        messageId: message_id,
        text: ""
      }

      assert {:reply, %Api.Message.Err{code: 400, error: "text is required"}, _} =
               Api.request(req, ctx.agent_api)
    end
  end

  describe "create many" do
    test "create", ctx do
      m1 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "TEST1"
      }

      m2 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "TEST2"
      }

      msg = %Api.Message.CreateMany{
        messages: [m1, m2]
      }

      assert {:reply, %Api.Message.Ok{messageIds: m_ids}, _} = Api.request(msg, ctx.user_api)

      assert [
               %Api.Event.Message{rawText: "TEST2"} = res2,
               %Api.Event.Message{rawText: "TEST1"} = res1
             ] = load(ctx.user_api, ctx.user_room)

      assert m_ids == [res1.id, res2.id]
    end
  end

  describe "forward" do
    test "load forward from unaccessible room", ctx do
      m1 = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        text: "TEST1"
      }

      assert {:reply, %Api.Message.Ok{messageId: m1_id}, _} = Api.request(m1, ctx.agent_api)

      m2 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        linkRoomId: ctx.agent_room.id,
        linkStartMessageId: m1_id,
        linkEndMessageId: m1_id,
        linkType: "forward",
        text: "Forwarded"
      }

      assert {:reply, %Api.Message.Ok{messageId: m2_id}, _} = Api.request(m2, ctx.agent_api)

      m3 = %Api.Message.GetSources{
        messageId: m2_id
      }

      assert {:reply, %Api.Message.Ok{items: [%Api.Event.Message{id: ^m1_id}]}, _} =
               Api.request(m3, ctx.user_api)
    end

    test "forwarded forwards ", ctx do
      m1 = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        text: "TEST1"
      }

      assert {:reply, %Api.Message.Ok{messageId: m1_id}, _} = Api.request(m1, ctx.agent_api)

      m2 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        linkRoomId: ctx.agent_room.id,
        linkStartMessageId: m1_id,
        linkEndMessageId: m1_id,
        linkType: "forward",
        text: "Forwarded"
      }

      assert {:reply, %Api.Message.Ok{messageId: m2_id}, _} = Api.request(m2, ctx.agent_api)

      m3 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        linkRoomId: ctx.user_room.id,
        linkStartMessageId: m2_id,
        linkEndMessageId: m2_id,
        linkType: "forward",
        text: "Forwarded2"
      }

      assert {:reply, %Api.Message.Ok{messageId: m3_id}, _} = Api.request(m3, ctx.agent_api)

      assert [
               %Api.Event.Message{
                 id: ^m3_id,
                 sources: [%Api.Event.Message{rawText: "TEST1"}]
               },
               %Api.Event.Message{
                 id: ^m2_id,
                 sources: [%Api.Event.Message{rawText: "TEST1"}]
               }
             ] = load(ctx.user_api, ctx.user_room)
    end
  end

  describe "with tag scoping" do
    setup ctx do
      scoping_f = flag("User Tag Scoping")
      flag(ctx.workspace, scoping_f)
      tag1 = tag(ctx.workspace, "#tag1")
      tag(ctx.user, [tag1])
      tag(ctx.user_room, [tag1])

      tag2 = tag(ctx.workspace, "#tag2")
      r2 = public_room(ctx.h1, "room2")
      tag(r2, [tag2])
      tag(ctx.u12, [tag2])

      binding()
    end

    test "load message from allowed room", ctx do
      m1 = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "TEST1"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(m1, ctx.user_api)
      assert [%Api.Event.Message{rawText: "TEST1"}] = load(ctx.user_api, ctx.user_room)
    end

    test "post to closed room is not allowed", ctx do
      m1 = %Api.Message.Create{
        roomId: ctx.r2.id,
        text: "TEST1"
      }

      assert {:reply, %Api.Message.Err{code: 403}, _} = Api.request(m1, ctx.user_api)
    end

    test "read from closed room is not allowed", ctx do
      m = %Api.Stream.Get{topic: topic(ctx.r2)}
      assert {:reply, %Api.Stream.Err{code: 403}, _} = Api.request(m, ctx.user_api)
    end
  end

  describe "update" do
    setup ctx do
      agent_message = message(ctx.user_room, ctx.agent, "AGENT MESSAGE")
      user_message = message(ctx.user_room, ctx.user, "USER MESSAGE")
      Kernel.binding()
    end

    test "user can update it's own messages", ctx do
      req = %Api.Message.Update{
        messageId: ctx.user_message.id,
        text: "USER MESSAGE UPDATE"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.user_api)
      assert items = load(ctx.user_api, ctx.user_room)
      assert m = Enum.find(items, &(&1.rawText == "USER MESSAGE UPDATE"))
      assert is_integer(m.editedTs)
      assert m.editedByType == "user"
      assert m.editedById == ctx.user.id
      assert m.editedByName == ctx.user.name
    end

    test "agent can update it's own messages", ctx do
      req = %Api.Message.Update{
        messageId: ctx.agent_message.id,
        text: "AGENT MESSAGE UPDATE"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.agent_api)
      assert items = load(ctx.user_api, ctx.user_room)
      assert m = Enum.find(items, &(&1.rawText == "AGENT MESSAGE UPDATE"))
      assert is_integer(m.editedTs)
      assert m.editedByType == "agent"
      assert m.editedById == ctx.agent.id
      assert m.editedByName == ctx.agent.name
    end

    test "agent can update other user messages", ctx do
      req = %Api.Message.Update{
        messageId: ctx.user_message.id,
        text: "USER MESSAGE UPDATE"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.agent_api)
      assert items = load(ctx.user_api, ctx.user_room)
      assert m = Enum.find(items, &(&1.rawText == "USER MESSAGE UPDATE"))
      assert is_integer(m.editedTs)
      assert m.editedByType == "agent"
      assert m.editedById == ctx.agent.id
      assert m.editedByName == ctx.agent.name
    end

    test "user can't update other user messages", ctx do
      req = %Api.Message.Update{
        messageId: ctx.agent_message.id,
        text: "AGENT MESSAGE UPDATE"
      }

      assert {:reply, %Api.Message.Err{code: 403}, _} = Api.request(req, ctx.user_api)
      assert "AGENT MESSAGE" in (load(ctx.user_api, ctx.user_room) |> Enum.map(& &1.rawText))
    end

    test "publish source/targets messages on forward delete", ctx do
      m1 = message(ctx.user_room, ctx.user, "M1")
      f1 = forward(ctx.user_room, ctx.user, [m1], "F1")
      f2 = forward(ctx.user_room, ctx.user, [f1], "F2")
      f3 = forward(ctx.user_room, ctx.user, [f2], "F3")
      f4 = forward(ctx.user_room, ctx.user, [f3], "F4")

      {m1_id, f1_id, f2_id, f3_id, f4_id} = {m1.id, f1.id, f2.id, f3.id, f4.id}

      req = %Api.Message.Update{
        messageId: f2.id,
        linkRoomId: nil,
        linkStartMessageId: nil,
        linkEndMessageId: nil,
        linkType: nil,
        text: nil
      }

      sid = sub("room/#{ctx.user_room.id}/messages")
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.user_api)

      assert_receive(
        {^sid, _,
         %Api.Event.Message{id: ^f1_id, targets: [], sources: [%Api.Event.Message{id: ^m1_id}]}}
      )

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^f2_id,
           targets: [%Api.Event.Message{id: ^f3_id}],
           sources: [],
           linkType: nil
         }}
      )

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^f3_id,
           targets: [%Api.Event.Message{id: ^f4_id}],
           sources: [%Api.Event.Message{id: ^f2_id}]
         }}
      )

      assert_receive(
        {^sid, _,
         %Api.Event.Message{id: ^f4_id, targets: [], sources: [%Api.Event.Message{id: ^f2_id}]}}
      )
    end

    test "publish targets on update", ctx do
      m1 = message(ctx.user_room, ctx.user, "M1")
      f1 = forward(ctx.user_room, ctx.user, [m1], "F1")
      f2 = forward(ctx.user_room, ctx.user, [f1], "F2")

      {m1_id, f1_id, f2_id} = {m1.id, f1.id, f2.id}

      req = %Api.Message.Update{
        messageId: m1.id,
        text: "UPDATE"
      }

      sid = sub("room/#{ctx.user_room.id}/messages")
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.user_api)

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^m1_id,
           targets: [%Api.Event.Message{id: ^f1_id}],
           sources: [],
           rawText: "UPDATE"
         }}
      )

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^f1_id,
           targets: [%Api.Event.Message{id: ^f2_id}],
           sources: [%Api.Event.Message{id: ^m1_id, rawText: "UPDATE"}]
         }}
      )

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^f2_id,
           targets: [],
           sources: [%Api.Event.Message{id: ^m1_id, rawText: "UPDATE"}]
         }}
      )
    end

    test "publish files on update", ctx do
      m_id = create_message_from_upload(ctx, "YO")

      req = %Api.Message.Update{
        messageId: m_id,
        text: "UPDATE",
        fileIds: []
      }

      sid = sub("room/#{ctx.user_room.id}/messages")
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.user_api)

      assert_receive(
        {^sid, _,
         %Api.Event.Message{
           id: ^m_id,
           rawText: "UPDATE",
           files: []
         }}
      )
    end

    test "delete message with files without text", ctx do
      mid = create_empty_message_from_upload(ctx)

      req = %Api.Message.Update{
        messageId: mid
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.agent_api)

      assert [%Fog.Api.Event.Message{deletedByType: "agent"} | _] =
               load(ctx.user_api, ctx.user_room)
    end

    test "edit message with text and files", ctx do
      {mid, _file_id0, file_id1} = create_nonempty_message_from_two_uploads(ctx)

      req = %Api.Message.Update{
        messageId: mid,
        text: "OHAI 2",
        fileIds: [file_id1]
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(req, ctx.agent_api)

      [message | _] = load(ctx.user_api, ctx.user_room)

      assert %Fog.Api.Event.Message{plainText: "OHAI 2"} = message

      %Fog.Api.Event.Message{files: files} = message

      assert 1 = length(files)

      assert [%{id: ^file_id1}] = files
    end
  end

  describe "set reaction" do
    setup ctx do
      user_message = message(ctx.user_room, ctx.user, "USER MESSAGE")
      agent_message = message(ctx.agent_room, ctx.agent, "AGENT MESSAGE")
      Kernel.binding()
    end

    test "add reaction", ctx do
      agentReaction = %Api.Message.SetReaction{
        messageId: ctx.user_message.id,
        reaction: "SMILEY"
      }

      userReaction = %Api.Message.SetReaction{
        messageId: ctx.user_message.id,
        reaction: "FIRE"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(agentReaction, ctx.agent_api)
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(userReaction, ctx.user_api)

      assert 2 ==
               length(
                 load(ctx.user_api, ctx.user_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )
    end

    test "update reaction", ctx do
      agentReaction1 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: "SMILEY"
      }

      userReaction1 = %Api.Message.SetReaction{
        messageId: ctx.user_message.id,
        reaction: "SAD"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(agentReaction1, ctx.agent_api)
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(userReaction1, ctx.user_api)

      assert "SMILEY" in (load(ctx.agent_api, ctx.agent_room)
                          |> Enum.at(0)
                          |> Map.get(:reactions)
                          |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.agent_api, ctx.agent_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )

      assert "SAD" in (load(ctx.user_api, ctx.user_room)
                       |> Enum.at(0)
                       |> Map.get(:reactions)
                       |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.user_api, ctx.user_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )

      agentReaction2 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: "FIRE"
      }

      userReaction2 = %Api.Message.SetReaction{
        messageId: ctx.user_message.id,
        reaction: "FIRE"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(agentReaction2, ctx.agent_api)
      assert {:reply, %Api.Message.Ok{}, _} = Api.request(userReaction2, ctx.user_api)

      assert "FIRE" in (load(ctx.agent_api, ctx.agent_room)
                        |> Enum.at(0)
                        |> Map.get(:reactions)
                        |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.agent_api, ctx.agent_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )

      assert "FIRE" in (load(ctx.user_api, ctx.user_room)
                        |> Enum.at(0)
                        |> Map.get(:reactions)
                        |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.user_api, ctx.user_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )
    end

    test "delete reaction", ctx do
      agentReaction1 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: "SMILEY"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(agentReaction1, ctx.agent_api)

      assert "SMILEY" in (load(ctx.agent_api, ctx.agent_room)
                          |> Enum.at(0)
                          |> Map.get(:reactions)
                          |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.agent_api, ctx.agent_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )

      agentReaction2 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: nil
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(agentReaction2, ctx.agent_api)

      assert "SMILEY" not in (load(ctx.agent_api, ctx.agent_room)
                              |> Enum.at(0)
                              |> Map.get(:reactions)
                              |> Enum.map(& &1.reaction))

      userReaction1 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: "SMILEY"
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(userReaction1, ctx.agent_api)

      assert "SMILEY" in (load(ctx.agent_api, ctx.agent_room)
                          |> Enum.at(0)
                          |> Map.get(:reactions)
                          |> Enum.map(& &1.reaction))

      assert 1 ==
               length(
                 load(ctx.agent_api, ctx.agent_room)
                 |> Enum.at(0)
                 |> Map.get(:reactions)
                 |> Enum.map(& &1.reaction)
               )

      userReaction2 = %Api.Message.SetReaction{
        messageId: ctx.agent_message.id,
        reaction: nil
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(userReaction2, ctx.agent_api)

      assert "SMILEY" not in (load(ctx.agent_api, ctx.agent_room)
                              |> Enum.at(0)
                              |> Map.get(:reactions)
                              |> Enum.map(& &1.reaction))

      assert [] ==
               load(ctx.agent_api, ctx.agent_room)
               |> Enum.at(0)
               |> Map.get(:reactions)
               |> Enum.map(& &1.reaction)
    end
  end

  describe "miscellaneous" do
    setup ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "some text"
      }

      assert {:reply, %Api.Message.Ok{messageId: message_id}, _} = Api.request(msg, ctx.user_api)

      [message_id: message_id]
    end

    test "visualize multiline and markdown", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: """
        par1_line1
          par1_line2
        par1_line3

        par2 [aaa](https://oo.o)

        par3

        ```
        code1_line1
          code1_line2

        code1_line3
        ```
        par4` code2 `

        par5 *i1* _i2_
          **strong1** __strong2__

        > quote1
        reply1

        > quote2

        reply2

         > quote3

        not > quote

        `code3` par5
        """
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{text: text, plainText: plain}] =
               load(ctx.user_api, ctx.user_room)

      assert "<p>par1_line1<br />  par1_line2<br />par1_line3</p><p>par2 <a href=\"https://oo.o\" target=\"_blank\">aaa</a></p><p>par3</p><pre><code>code1_line1\n  code1_line2\n\ncode1_line3</code></pre><p>par4<code class=\"inline\">code2</code></p><p>par5 <em>i1</em> <em>i2</em><br />  <strong>strong1</strong> <strong>strong2</strong></p><blockquote><p>quote1<br />reply1</p></blockquote><blockquote><p>quote2</p></blockquote><p>reply2</p><blockquote><p>quote3</p></blockquote><p>not &gt; quote</p><p><code class=\"inline\">code3</code> par5</p>" ==
               text

      assert "par1_line1\n  par1_line2\npar1_line3\n\npar2 aaa\n\npar3\n\ncode1_line1\n  code1_line2\n\ncode1_line3\n\npar4code2\n\npar5 i1 i2\n  strong1 strong2\n\nquote1\nreply1\n\nquote2\n\nreply2\n\nquote3\n\nnot > quote\n\ncode3 par5"
      plain
    end

    test "markdown: escaping backticks", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: """
        ``code1``
        ``code`1``
        ``code`1` ``
        `` `code1``
        """
      }

      {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      [%Api.Event.Message{text: text, plainText: plain}] = load(ctx.user_api, ctx.user_room)

      assert "<p><code class=\"inline\">code1</code><br /><code class=\"inline\">code`1</code><br /><code class=\"inline\">code`1`</code><br /><code class=\"inline\">`code1</code></p>" ==
               text

      assert "code1\ncode`1\ncode`1`\n`code1" = plain
    end

    test "markdown: emphasis", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: """
        1_ 1_
        _2 _2
        _3 3_3_
        4* *4* 4* *
        *5 *5* 5
        6 *6* **6*
        _7_.
        *8*!
        """
      }

      {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      [%Api.Event.Message{text: text, plainText: plain}] = load(ctx.user_api, ctx.user_room)

      assert text ==
               "<p>1<em> 1</em><br /><em>2 _2<br />_3 3_3</em><br />4<em> </em>4<em> 4</em> <em> </em>5 <em>5</em> 5<br />6 <em>6</em> <em>*6</em><br /><em>7</em>.<br /><em>8</em>!</p>"

      assert plain == "11\n2 _2\n_3 3_3\n444 5 5 5\n6 6 *6\n7.\n8!"
    end

    test "link detection", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: """
         aaa.com/a*b*c
        aaa.aa
        https://aa.aa
        `aaa.com`
        ```
        fdfdfd aaa.com asasas
        ```
        http://aaa.com/_1_
        [test](aa.com/a*b*c)
        """
      }

      assert {:reply, %Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [%Api.Event.Message{text: text, plainText: plain}] =
               load(ctx.user_api, ctx.user_room)

      assert text ==
               "<p> aaa.com/a<em>b</em>c<br />aaa.aa<br /><a href=\"https://aa.aa\" target=\"_blank\">https://aa.aa</a><br /><code class=\"inline\">aaa.com</code></p><pre><code>fdfdfd aaa.com asasas</code></pre><p><a href=\"http://aaa.com/_1\" target=\"_blank\">http://aaa.com/_1</a>_<br /><a href=\"aa.com/a*b*c\" target=\"_blank\">test</a></p>"

      assert plain ==
               "aaa.com/abc\naaa.aa\nhttps://aa.aa\naaa.com\n\nfdfdfd aaa.com asasas\n\nhttp://aaa.com/_1_\ntest"
    end

    test "empty messages not allowed", ctx do
      msg = %Api.Message.Update{
        messageId: ctx.message_id,
        text: ""
      }

      assert {:reply, %Fog.Api.Message.Err{code: 400, error: "text is required"}, _} =
               Api.request(msg, ctx.user_api)
    end

    test "empty messages allowed for file uploads", ctx do
      create_empty_message_from_upload(ctx)

      assert [%Api.Event.Message{rawText: raw}, _] = load(ctx.user_api, ctx.user_room)
      assert "" == raw
    end

    test "update text in empty message with file", ctx do
      empty_msg_id = create_empty_message_from_upload(ctx)

      # "" -> "some text"
      req = %Api.Message.Update{
        messageId: empty_msg_id,
        text: "some text"
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)

      assert [%Api.Event.Message{rawText: raw}, _] = load(ctx.user_api, ctx.user_room)
      assert "some text" == raw

      # "some text" -> ""
      req = %Api.Message.Update{
        messageId: empty_msg_id,
        text: ""
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)

      assert [%Api.Event.Message{rawText: raw, files: files}, _] =
               load(ctx.user_api, ctx.user_room)

      assert "" === raw
      assert 1 === length(files)
    end

    test "update message with file to no files", ctx do
      empty_msg_id = create_empty_message_from_upload(ctx)

      req = %Api.Message.Update{
        messageId: empty_msg_id,
        fileIds: []
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)

      assert [%Api.Event.Message{files: files}, _] = load(ctx.user_api, ctx.user_room)
      assert 0 === length(files)
    end

    test "update message to empty text and file", ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "yo"
      }

      assert {:reply, %Api.Message.Ok{messageId: msg_id}, _} = Api.request(msg, ctx.user_api)

      file = %Api.File.Upload{
        roomId: ctx.user_room.id,
        fileName: "test.txt",
        fileType: "text/plain",
        binaryData: {0, ""}
      }

      assert {:reply, %Api.File.Ok{fileId: file_id}, _} = Api.request(file, ctx.user_api)

      req = %Api.Message.Update{
        messageId: msg_id,
        text: "",
        fileIds: [file_id]
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)

      assert [%Api.Event.Message{rawText: raw, files: files}, _] =
               load(ctx.user_api, ctx.user_room)

      assert "" === raw
      assert 1 === length(files)
      assert file_id == files |> Enum.find_value(& &1.id)
    end

    test "forward empty messages", ctx do
      empty_msg_id = create_empty_message_from_upload(ctx)

      req = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        linkRoomId: ctx.user_room.id,
        linkStartMessageId: empty_msg_id,
        linkEndMessageId: empty_msg_id,
        linkType: "forward",
        text: "forwarded"
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)
    end

    test "reply to empty messages", ctx do
      empty_msg_id = create_empty_message_from_upload(ctx)

      req = %Api.Message.Create{
        roomId: ctx.agent_room.id,
        linkRoomId: ctx.user_room.id,
        linkStartMessageId: empty_msg_id,
        linkEndMessageId: empty_msg_id,
        linkType: "reply",
        text: "replied"
      }

      assert {:reply, %Api.Message.Ok{messageId: _}, _} = Api.request(req, ctx.agent_api)
    end
  end

  defp load(api, room) do
    msg = %Api.Stream.Get{topic: topic(room)}
    assert {:reply, %Api.Stream.GetOk{items: items}, _} = Api.request(msg, api)
    items
  end

  defp topic(room), do: "room/#{room.id}/messages"

  defp create_empty_message_from_upload(ctx) do
    file = %Api.File.Upload{
      roomId: ctx.user_room.id,
      fileName: "test.txt",
      fileType: "text/plain",
      binaryData: {0, ""}
    }

    assert {:reply, %Api.File.Ok{fileId: file_id}, _} = Api.request(file, ctx.user_api)

    msg = %Api.Message.Create{
      roomId: ctx.user_room.id,
      text: "",
      fileIds: [file_id]
    }

    assert {:reply, %Api.Message.Ok{messageId: msg_id}, _} = Api.request(msg, ctx.user_api)
    msg_id
  end

  defp create_message_from_upload(ctx, text) do
    file = %Api.File.Upload{
      roomId: ctx.user_room.id,
      fileName: "test.txt",
      fileType: "text/plain",
      binaryData: {0, ""}
    }

    assert {:reply, %Api.File.Ok{fileId: file_id}, _} = Api.request(file, ctx.user_api)

    msg = %Api.Message.Create{
      roomId: ctx.user_room.id,
      text: text,
      fileIds: [file_id]
    }

    assert {:reply, %Api.Message.Ok{messageId: msg_id}, _} = Api.request(msg, ctx.user_api)
    msg_id
  end

  defp create_nonempty_message_from_two_uploads(ctx) do
    file0 = %Api.File.Upload{
      roomId: ctx.user_room.id,
      fileName: "test0.txt",
      fileType: "text/plain",
      binaryData: {0, ""}
    }

    file1 = %Api.File.Upload{
      roomId: ctx.user_room.id,
      fileName: "test0.txt",
      fileType: "text/plain",
      binaryData: {0, ""}
    }

    assert {:reply, %Api.File.Ok{fileId: file_id0}, _} = Api.request(file0, ctx.user_api)
    assert {:reply, %Api.File.Ok{fileId: file_id1}, _} = Api.request(file1, ctx.user_api)

    msg = %Api.Message.Create{
      roomId: ctx.user_room.id,
      text: "OHAI",
      fileIds: [file_id0, file_id1]
    }

    assert {:reply, %Api.Message.Ok{messageId: msg_id}, _} = Api.request(msg, ctx.user_api)
    {msg_id, file_id0, file_id1}
  end

  describe "with name and avatar override" do
    test "with empty string", ctx do
      msg = %Api.Message.Create{
        roomId: ctx.user_room.id,
        text: "some text",
        fromNameOverride: "NAME OVERRIDE",
        fromAvatarUrlOverride: "AVATAR/OVERRIDE"
      }

      assert {:reply, %Fog.Api.Message.Ok{}, _} = Api.request(msg, ctx.user_api)

      assert [
               %Api.Event.Message{
                 fromNameOverride: "NAME OVERRIDE",
                 fromAvatarUrlOverride: "AVATAR/OVERRIDE"
               }
             ] = load(ctx.user_api, ctx.user_room)
    end
  end
end
