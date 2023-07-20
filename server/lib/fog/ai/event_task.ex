defmodule Fog.Ai.EventTask do
  require Logger

  @default_history_age_hours 12

  alias Fog.{Ai, Api, Data, Integration, Repo, Utils}

  def child_spec() do
    {Task.Supervisor, name: __MODULE__}
  end

  def schedule(params) do
    Task.Supervisor.start_child(__MODULE__, __MODULE__, :maybe_run, [params])

    :ok
  end

  def maybe_run(params) do
    # Don't do anything if we don't have any ai integrations. (For tests, mainly.)
    room =
      case params |> Keyword.fetch(:room) do
        {:ok, room} ->
          room

        :error ->
          {:ok, %{roomId: room_id}} = params |> Keyword.fetch(:cmd)

          Repo.Room.get(room_id)
      end

    room = room |> Repo.preload(:workspace)

    case Fog.Ai.integration(room.workspace.id) do
      nil ->
        :ok

      integration ->
        run(params ++ [integration: integration])
    end
  end

  def run(
        cmd: %Api.Ai.Suggest{startMessageId: start_message_id, endMessageId: end_message_id},
        room: %Data.Room{id: room_id, helpdesk_id: helpdesk_id},
        sess: %Api.Session.Agent{agentId: agent_id},
        integration: ai_integration
      ) do
    {%Api.Session.Agent{agentId: bot_agent_id} = bot_sess, _ai_integration} =
      get_bot_sess(ai_integration)

    messages = Repo.Room.messages_slice(room_id, start_message_id, end_message_id)

    question =
      messages
      |> Enum.map(fn m ->
        m.text
      end)
      |> Enum.join("\n\n")

    room =
      Data.Room
      |> Repo.get(room_id)
      |> Repo.preload([:customer])

    response_room =
      if Repo.Room.internal?(room.customer) do
        room
      else
        %Data.Room{} = Repo.Room.create_dialog([agent_id, bot_agent_id], helpdesk_id: helpdesk_id)
      end

    start_typing(response_room, bot_sess)

    post_message(
      response_room,
      "Hi there! Looking for answers...",
      bot_sess
    )

    case Ai.find_similar(ai_integration.workspace_id, question) do
      [%{prompt: %Data.PromptCluster{}} | _] = matches ->
        res =
          matches
          |> Enum.find_value(fn %{source_id: source_id} = prompt ->
            case Repo.get(Data.EmbeddingsSource, source_id) do
              nil ->
                nil

              source ->
                {prompt, source}
            end
          end)

        case res do
          {%{prompt: %Data.PromptCluster{prompt: context}}, source} ->
            trim_context = fn c, f ->
              case byte_size(c) do
                size when size > 6000 ->
                  c =
                    c
                    |> String.split(" ")
                    |> trim_list(100)
                    |> Enum.join(" ")

                  Logger.info("#{size} Trimming context...")

                  f.(c, f)

                _ ->
                  c
              end
            end

            context = trim_context.(context, trim_context)

            system = """
            Some context that could be relevant to answer the question:
            <|im_sep|>
            #{context}
            """

            messages = [
              %{"role" => "system", "content" => system},
              %{"role" => "user", "content" => question}
            ]

            source_link = "**Source**: [#{source.url}](#{source.url})"

            :ok =
              ask_gpt_and_post_answer(
                messages,
                matches,
                question,
                source_link,
                room_id,
                response_room,
                bot_sess,
                agent_id
              )

          _ ->
            stop_typing(response_room, bot_sess)
            :ok
        end

      _ ->
        Logger.error("Found nothing similar for: #{question}")
        stop_typing(response_room, bot_sess)
        :ok
    end
  end

  def run(
        cmd: %Api.Message.Update{fromApp: from_app},
        message: %Data.Message{text: text} = message,
        room: room,
        sess: agent_sess,
        integration: ai_integration
      )
      when from_app !== "ai" do
    room = room |> Repo.preload([:vendor, :workspace, tags: :tag])

    missing_boundary_marker_tag =
      room.tags |> Enum.find(&(&1.tag.name === ":missing_boundary_marker"))

    case missing_boundary_marker_tag do
      nil ->
        :ok

      _ ->
        case text |> String.starts_with?("$$$") do
          true ->
            room =
              Repo.Room.update_tags(
                room.id,
                [],
                [missing_boundary_marker_tag.tag_id],
                agent_sess.agentId,
                nil
              )

            do_file_issue(
              ai_integration: ai_integration,
              boundary_message: message,
              room: room,
              agent_sess: agent_sess
            )

            reset_all_tags(room.id, agent_sess)

          false ->
            :ok
        end
    end

    :ok
  end

  def run(
        cmd: %Api.Message.Create{fromApp: from_app},
        message: %Data.Message{text: text} = message,
        room: %Data.Room{type: "dialog"} = room,
        sess: agent_sess,
        integration: ai_integration
      )
      when from_app !== "ai" do
    room = room |> Repo.preload([:vendor, :workspace, :helpdesk, :members])
    workspace = room.workspace

    tag_name = Ai.integration_tag_name(ai_integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, tag_name)

    # dialog between bot and the agent
    if room.type === "dialog" do
      agent_id = agent_sess.agentId
      has_bot = room.members |> Enum.find(fn rm -> rm.agent_id == bot_agent.id end)
      has_agent = room.members |> Enum.find(fn rm -> rm.agent_id == agent_id end)

      if has_bot && has_agent do
        case find_metadata_for_response(message, room.id, bot_agent.id) do
          {:ok, messages} ->
            question = text

            messages =
              trim_content(messages) ++
                [
                  %{"role" => "user", "content" => question}
                ]

            matches = []
            source_link = ""

            {%Api.Session.Agent{} = bot_sess, _ai_integration} = get_bot_sess(ai_integration)

            start_typing(room, bot_sess)

            dialog = room
            room_id = room.id

            :ok =
              ask_gpt_and_post_answer(
                messages,
                matches,
                question,
                source_link,
                room_id,
                dialog,
                bot_sess,
                agent_id
              )

            stop_typing(room, bot_sess)

            {:ok, messages}

          _ ->
            :ok
        end
      end
    end

    :ok
  end

  def run(
        cmd: %Api.Message.Create{fromApp: from_app},
        message: %Data.Message{text: text} = message,
        room: room,
        sess: agent_sess,
        integration: ai_integration
      )
      when from_app !== "ai" do
    room = room |> Repo.preload([:vendor, :workspace, :helpdesk, :members])
    workspace = room.workspace

    tag_name = Ai.integration_tag_name(ai_integration)

    bot_agent = Repo.Agent.get_bot_by_tag_name(workspace.id, tag_name)

    if room.type === "public" ||
         room.members |> Enum.find(fn rm -> rm.agent_id == bot_agent.id end) do
      bot_sess = Api.Session.for_agent(room.vendor.id, bot_agent.id)

      prompts = ai_integration.specifics["prompts"]

      prompt_tags = prompt_tags(room)
      file_issue_options_tags = file_issue_options_tags(room)
      missing_boundary_marker_tag = missing_boundary_marker_tag(room)

      case check_mentions(
             ai_integration: ai_integration,
             room: room,
             message: message,
             bot_agent: bot_agent,
             prompts: prompts,
             bot_sess: bot_sess,
             agent_sess: agent_sess
           ) do
        :ok ->
          :ok

        :not_found ->
          workspace = room.workspace

          case prompt_tags do
            [room_tag | _] = tags ->
              [_, _, prompt_id, question_id] = room_tag.tag.name |> String.split(":")

              prompt = prompts |> Enum.find(&("#{&1["id"]}" === prompt_id))

              case prompt do
                nil ->
                  _room =
                    Repo.Room.update_tags(
                      room.id,
                      [],
                      tags |> Enum.map(& &1.tag_id),
                      agent_sess.agentId,
                      nil
                    )

                _ ->
                  questions = prompt["instruction"] |> Jason.decode!()

                  {question_id, ""} = Integer.parse(question_id)

                  this_question = this_question(question_id, questions)
                  next_question = next_question(question_id, questions)

                  stop_words = this_question["stop_words"] || []
                  is_stop_word = text in stop_words

                  case {text, this_question, next_question} do
                    {_, %{"stop_words" => _, "question_text" => question_text}, _}
                    when is_stop_word === false ->
                      stop_word = stop_words |> hd

                      post_message(
                        room,
                        """
                          You're answering the question "#{question_text}"

                          You can keep answering by posting messages and uploading files; if you're done with this question, please post **#{stop_word}**
                        """,
                        bot_sess
                      )

                    {_, _, nil} ->
                      room = reset_tags(room.id, tags, agent_sess)
                      post_message(room, "Thank you! $$$", bot_sess)
                      :ok

                    {_, _, %{"question_id" => question_id, "question_text" => question_text}} ->
                      room = reset_tags(room.id, tags, agent_sess)
                      set_prompt_tag(workspace.id, room.id, prompt_id, question_id, agent_sess)
                      post_message(room, question_text, bot_sess)

                    {"yes", _,
                     {[%{"question_id" => question_id, "question_text" => question_text} | _], _}} ->
                      room = reset_tags(room.id, tags, agent_sess)
                      set_prompt_tag(workspace.id, room.id, prompt_id, question_id, agent_sess)
                      post_message(room, question_text, bot_sess)

                    {"no", _,
                     {_, [%{"question_id" => question_id, "question_text" => question_text} | _]}} ->
                      room = reset_tags(room.id, tags, agent_sess)
                      set_prompt_tag(workspace.id, room.id, prompt_id, question_id, agent_sess)
                      post_message(room, question_text, bot_sess)

                    {response, _, _} ->
                      post_message(
                        room,
                        "Sorry! I don't understand '#{response}'. Please respond with **yes** or **no**",
                        bot_sess
                      )
                  end
              end

            _ ->
              case file_issue_options_tags do
                [file_issue_tag | _] ->
                  [_, _, type, options] = file_issue_tag.tag.name |> String.split(":")

                  options = options |> String.split(",")

                  indices =
                    options
                    |> Enum.map(fn o ->
                      [i | [t]] = o |> String.split("|", parts: 2)
                      {i, t}
                    end)

                  project_id =
                    indices
                    |> Enum.find_value(fn
                      {^text, project_id} ->
                        project_id

                      _ ->
                        false
                    end)

                  if project_id do
                    integration =
                      Repo.Integration.get_by_type_project_id(
                        room.workspace.id,
                        type,
                        project_id
                      )

                    file_issue(
                      room: room,
                      integration: integration,
                      ai_integration: ai_integration,
                      bot_sess: bot_sess,
                      agent_sess: agent_sess
                    )
                  else
                    post_message(
                      room,
                      "Sorry, I don't understand #{text}. I'm expecting one of #{indices |> Enum.map(&(&1 |> elem(0))) |> Enum.join(", ")}",
                      bot_sess
                    )
                  end

                  :ok

                _ ->
                  case missing_boundary_marker_tag do
                    nil ->
                      :ok

                    _tag ->
                      handle_boundary_marker(room, bot_sess, agent_sess)
                  end
              end
          end
      end
    end

    :ok
  end

  def run(_), do: :ok

  def ask_gpt_and_post_answer(
        messages,
        matches,
        question,
        source_link,
        room_id,
        dialog,
        bot_sess,
        agent_id
      ) do
    case Ai.ask_chat_ai(messages, "#{room_id}:#{agent_id}") do
      {:response, %{"content" => response} = resp_message} ->
        answer = """
          **Question**: #{question}

          #{source_link}

          **Response**: #{response}
        """

        new_messages = messages ++ [resp_message]

        meta = %{
          "version" => "2023.3.1",
          "messages" => new_messages
        }

        post_message(dialog, answer, bot_sess, meta)

        stop_typing(dialog, bot_sess)

        if Mix.env() === :dev && System.get_env("AI_SHOW_DEBUG") !== "false" do
          embeddings =
            matches
            |> Enum.map(fn m ->
              source = Data.EmbeddingsSource |> Repo.get(m.source_id)

              %{
                source_id: m.source_id,
                source_url: source.url,
                prompt: m.prompt.prompt,
                similarity: m.similarity
              }
            end)
            |> Enum.take(3)

          json =
            Jason.encode!(
              %{
                question: question,
                embeddings: embeddings,
                messages: new_messages
              },
              pretty: true
            )

          post_message(dialog, "```\n#{json}\n```", bot_sess)
        end

      e ->
        Logger.error("Error: #{inspect(e)} #{Exception.format_stacktrace()}")
        post_message(dialog, "Sorry, no luck", bot_sess)
        stop_typing(dialog, bot_sess)
    end

    :ok
  end

  defp find_metadata_for_response(message, room_id, bot_agent_id) do
    case find_metadata_for_response_in_replies(message) do
      {:ok, messages} ->
        {:ok, messages}

      nil ->
        case find_metadata_to_reply_in_previous_messages(room_id, bot_agent_id) do
          {:ok, messages} ->
            {:ok, messages}

          nil ->
            {:error, :no_previous_messages}
        end
    end
  end

  defp find_metadata_for_response_in_replies(message) do
    # is this message a reply to a message from the bot?
    if message.link_type === "reply" do
      message = message |> Fog.Repo.preload(sources: [:files])

      files =
        for s <- message.sources, file <- s.message_files do
          file.file.data
        end

      meta_data =
        files |> Enum.filter(&(&1["type"] === "metadata")) |> Enum.map(& &1["meta_data"])

      case meta_data do
        [
          %{
            "version" => "2023.3.1",
            "messages" => messages
          }
          | _
        ] ->
          {:ok, messages}

        _ ->
          nil
      end
    end
  end

  defp find_metadata_to_reply_in_previous_messages(room_id, bot_agent_id) do
    # let's just find the last message from the bot
    bot_messages =
      Fog.Repo.Message.messages_from_agent(
        room_id: room_id,
        agent_id: bot_agent_id,
        preload: [message_files: :file],
        # on dev debug message will show up
        limit: 2
      )

    files =
      for m <- bot_messages, file <- m.message_files do
        file.file.data
      end

    meta_data = files |> Enum.filter(&(&1["type"] === "metadata")) |> Enum.map(& &1["meta_data"])

    case meta_data do
      [
        %{
          "version" => "2023.3.1",
          "messages" => messages
        }
        | _
      ] ->
        {:ok, messages}

      _ ->
        nil
    end
  end

  def handle_boundary_marker(room, bot_sess, agent_sess) do
    case find_boundary_marker(room.id) do
      nil ->
        tag = Repo.Tag.create(room.workspace.id, ":missing_boundary_marker")
        room = Repo.Room.update_tags(room.id, [tag.id], [], agent_sess.agentId, nil)

        post_message(
          room,
          "I need to know the beginning of the conversation that describes the problem. Can you find the message where the conversation starts and update it with $$$ at the start of line?",
          bot_sess
        )

        :pending

      boundary_marker ->
        {:ok, boundary_marker}
    end
  end

  def set_prompt_tag(workspace_id, room_id, prompt_id, question_id, agent_sess) do
    prompt_tag = Repo.Tag.create(workspace_id, ":prompt:#{prompt_id}:#{question_id}")

    Repo.Room.update_tags(room_id, [prompt_tag.id], [], agent_sess.agentId, nil)
  end

  def check_mentions(
        ai_integration: ai_integration,
        room: room,
        message: %Data.Message{mentions: mentions, text: text},
        bot_agent: bot_agent,
        prompts: prompts,
        bot_sess: bot_sess,
        agent_sess: agent_sess
      ) do
    case mentions |> Enum.find(&(&1.agent_id === bot_agent.id)) do
      %Data.Mention{text: mention_text} ->
        text_without_mention = text |> String.replace("@#{mention_text} ", "")
        prompt = prompts |> Enum.find(&(&1["command"] === text_without_mention))

        case prompt do
          nil ->
            file_issue_commands =
              Repo.Integration.get_by_meta_type(room.workspace.id, "issue_tracker")
              |> Enum.reduce([], fn i, acc ->
                [{Integration.file_issue_command(i), i} | acc]
              end)

            integrations =
              file_issue_commands
              |> Enum.filter(fn
                {^text_without_mention, _i} -> true
                _ -> false
              end)

            case integrations do
              [] ->
                :ok

              [{_, integration}] ->
                file_issue(
                  room: room,
                  integration: integration,
                  ai_integration: ai_integration,
                  bot_sess: bot_sess,
                  agent_sess: agent_sess
                )

                :ok

              [{_, %{type: type}} | _] = integrations ->
                text =
                  "Please choose:\n\n" <>
                    (integrations
                     |> Enum.with_index(1)
                     |> Enum.map(fn {{_, i}, index} ->
                       "#{index} for #{i |> Integration.name()}"
                     end)
                     |> Enum.join("\n"))

                post_message(room, text, bot_sess)

                options =
                  integrations
                  |> Enum.with_index(1)
                  |> Enum.map(fn {{_, i}, index} ->
                    "#{index}|#{i.project_id}"
                  end)
                  |> Enum.join(",")

                tag = Repo.Tag.create(room.workspace.id, ":file_issue_options:#{type}:#{options}")

                Repo.Room.update_tags(
                  room.id,
                  [tag.id],
                  file_issue_options_tags(room) |> Enum.map(& &1.tag.id),
                  agent_sess.agentId,
                  nil
                )

                :ok
            end

          %{"id" => prompt_id, "instruction" => instruction} ->
            case instruction |> Jason.decode() do
              {:ok, [question | _] = questions} when is_list(questions) ->
                reset_tags(room.id, prompt_tags(room) ++ file_issue_tags(room), agent_sess)

                room =
                  set_prompt_tag(
                    room.workspace.id,
                    room.id,
                    prompt_id,
                    question["question_id"],
                    agent_sess
                  )

                post_message(room, "$$$\n\n#{question["question_text"]}", bot_sess)

                :ok

              _ ->
                case prompt do
                  %{"command" => "stop"} ->
                    reset_all_tags(room.id, agent_sess)
                    post_message(room, "OK", bot_sess)
                    :ok

                  _ ->
                    :ok
                end
            end
        end

      _ ->
        :not_found
    end
  end

  def reset_tags(room_id, tags, agent_sess) do
    Repo.Room.update_tags(room_id, [], tags |> Enum.map(& &1.tag_id), agent_sess.agentId, nil)
  end

  def reset_all_tags(room_id, agent_sess) do
    room = Repo.Room.get(room_id) |> Repo.preload(tags: :tag)

    prompt_tags = prompt_tags(room)
    file_issue_options_tags = file_issue_options_tags(room)
    file_issue_tags = file_issue_tags(room)
    missing_boundary_marker_tag = missing_boundary_marker_tag(room)

    reset_tags(
      room_id,
      prompt_tags ++
        file_issue_options_tags ++
        if missing_boundary_marker_tag do
          [missing_boundary_marker_tag]
        else
          []
        end ++ file_issue_tags,
      agent_sess
    )
  end

  def prompt_tags(room),
    do: room.tags |> Enum.filter(&(&1.tag.name |> String.starts_with?(":prompt:")))

  def file_issue_options_tags(room),
    do: room.tags |> Enum.filter(&(&1.tag.name |> String.starts_with?(":file_issue_options:")))

  def file_issue_tags(room),
    do: room.tags |> Enum.filter(&(&1.tag.name |> String.starts_with?(":file_issue:")))

  def missing_boundary_marker_tag(room),
    do: room.tags |> Enum.find(&(&1.tag.name === ":missing_boundary_marker"))

  def file_issue(
        room: room,
        integration: integration,
        ai_integration: ai_integration,
        bot_sess: bot_sess,
        agent_sess: agent_sess
      ) do
    room =
      reset_tags(room.id, file_issue_options_tags(room), agent_sess) |> Repo.preload([:workspace])

    tag =
      Repo.Tag.create(
        room.workspace.id,
        ":file_issue:#{integration.type}:#{integration.project_id}"
      )

    room =
      Repo.Room.update_tags(room.id, [tag.id], [], agent_sess.agentId, nil)
      |> Repo.preload([:workspace])

    file_issue_text = fn integration ->
      "Filing a #{Integration.info(integration.type).name} issue in #{Integration.name(integration)}"
    end

    post_message(
      room,
      file_issue_text.(integration),
      bot_sess
    )

    case handle_boundary_marker(room, bot_sess, agent_sess) do
      :pending ->
        :ok

      {:ok, boundary_message} ->
        do_file_issue(
          ai_integration: ai_integration,
          boundary_message: boundary_message,
          room: room,
          agent_sess: agent_sess
        )

        stop_typing(room, bot_sess)

        reset_all_tags(room.id, agent_sess)
    end
  end

  def do_file_issue(
        ai_integration: ai_integration,
        boundary_message: boundary_message,
        room: room,
        agent_sess: agent_sess
      ) do
    room = room |> Repo.preload([:vendor, :workspace, tags: :tag])

    [file_issue_tag] =
      room.tags |> Enum.filter(&(&1.tag.name |> String.starts_with?(":file_issue:")))

    ["", "file_issue", type, project_id] = file_issue_tag.tag.name |> String.split(":", parts: 4)

    case Repo.Integration.get_by_type_project_id(room.workspace.id, type, project_id) do
      nil ->
        {:error, :no_integrations}

      integration ->
        {bot_sess, _ai_integration} = get_bot_sess(ai_integration)
        start_typing(room, bot_sess)

        messages = messages_to_marker(room_id: room.id, boundary_message_id: boundary_message.id)

        context =
          issue_context(room: room, boundary_message: boundary_message, messages: messages)

        ask = """
          Come up with a title for the following text. The title should be at most 8 words long and should not be wrapped in quotes.

          Text = ###
            #{context}
          ###
        """

        case Ai.ask_ai(ask) do
          {:response, response} ->
            title = response |> String.trim()

            msg_id = hd(messages).id
            msg_url = Utils.message_url(room.vendor.id, room.workspace.id, room.id, msg_id)

            body = "[See original conversation in Fogbender](#{msg_url})\n\n#{context}"

            %{id: link_start_message_id} = List.first(messages)
            %{id: link_end_message_id} = List.last(messages)

            cmd = %Api.Integration.CreateIssueWithForward{
              workspaceId: room.workspace.id,
              integrationProjectId: integration.project_id,
              title: title,
              linkRoomId: room.id,
              linkStartMessageId: link_start_message_id,
              linkEndMessageId: link_end_message_id,
              body: body
            }

            {:reply, %Api.Integration.Ok{issueTag: issue_tag_name}} =
              Api.Integration.info(cmd, agent_sess)

            case Utils.internal_hid(room.workspace.id) do
              hid when hid === room.helpdesk.id ->
                :ok

              _ ->
                cmd = %Api.Room.Create{
                  name: title,
                  helpdeskId: room.helpdesk.id,
                  linkRoomId: room.id,
                  linkStartMessageId: link_start_message_id,
                  linkEndMessageId: link_end_message_id,
                  meta: [issue_tag_name]
                }

                {:reply, %Api.Room.Ok{}} = Api.Room.info(cmd, agent_sess)

                post_message(
                  room,
                  "New issue filed: **#{title}**",
                  bot_sess
                )
            end

          e ->
            Logger.error("#{e} - #{Exception.format_stacktrace()}")
            {:error, :cant_file}
        end
    end
  end

  def issue_context(room: room, boundary_message: boundary_message, messages: messages) do
    messages
    |> Enum.map(fn m ->
      m = m |> Repo.preload(:files)

      msg_url = Utils.message_url(room.vendor.id, room.workspace.id, room.id, m.id)

      text =
        if m.id === boundary_message.id do
          m.text |> String.replace(~r/^[$]{3}\s*/, "")
        else
          m.text
        end

      text =
        text <>
          (m.files
           |> Enum.map(fn f ->
             case f.content_type do
               "image" <> _ ->
                 "[Image upload](#{msg_url})"

               _ ->
                 "[File upload](#{msg_url})"
             end
           end)
           |> Enum.join("\n\n"))

      case Utils.get_author(m) do
        %Data.Agent{} ->
          "### #{text |> String.replace(~r/\s+/, " ")}"

        _ ->
          "#{text}"
      end
    end)
    |> Enum.join("\n\n")
  end

  def this_question(_, []), do: nil

  def this_question(question_id, [h | t]) do
    case h do
      %{"question_id" => ^question_id} ->
        h

      %{"on_affirmative" => affirmative, "on_negative" => negative} ->
        this_question(question_id, affirmative ++ negative ++ t)

      %{"on_affirmative" => affirmative} ->
        this_question(question_id, affirmative ++ t)

      %{"on_negative" => negative} ->
        this_question(question_id, negative ++ t)

      _ ->
        this_question(question_id, t)
    end
  end

  def next_question(_, []), do: nil

  def next_question(question_id, [h | t]) do
    case h do
      %{"question_id" => ^question_id, "on_affirmative" => affirmative, "on_negative" => negative} ->
        {affirmative, negative}

      %{"question_id" => ^question_id, "on_affirmative" => affirmative} ->
        {affirmative, t}

      %{"question_id" => ^question_id, "on_negative" => negative} ->
        {t, negative}

      %{"question_id" => ^question_id} ->
        case t do
          [] ->
            nil

          _ ->
            [next | _] = t
            next
        end

      %{"on_affirmative" => affirmative, "on_negative" => negative} ->
        case next_question(question_id, affirmative ++ t) do
          nil ->
            next_question(question_id, negative ++ t)

          res ->
            res
        end

      %{"on_affirmative" => affirmative} ->
        case next_question(question_id, affirmative ++ t) do
          nil ->
            next_question(question_id, t)

          res ->
            res
        end

      %{"on_negative" => negative} ->
        case next_question(question_id, negative ++ t) do
          nil ->
            next_question(question_id, t)

          res ->
            res
        end

      _ ->
        next_question(question_id, t)
    end
  end

  def ask_ai(prompt) do
    prompt = "#{prompt}\n%%" |> String.replace("\n", "\r")

    task =
      Task.async(fn ->
        Ai.Api.completions(prompt)
      end)

    yield = fn yield ->
      case Task.yield(task, 5_000) do
        {:ok, result} ->
          result

        nil ->
          yield.(yield)

        {:exit, reason} ->
          {:error, reason}
      end
    end

    res = yield.(yield)

    case res do
      {:error, _} = error ->
        error

      %{"choices" => [%{"text" => ""} | _]} ->
        :empty_response

      %{"choices" => [%{"text" => response} | _]} ->
        case response |> String.trim() do
          "" ->
            :empty_response

          trimmed ->
            {:response, trimmed}
        end
    end
  end

  def start_typing(room, bot_sess) do
    typing_cmd = %Api.Typing.Set{
      roomId: room.id
    }

    {:ok, _} = Api.Typing.info(typing_cmd, bot_sess)
  end

  def stop_typing(room, bot_sess) do
    {:ok, _} = Api.Typing.info({:reset_typing, room.id}, bot_sess)
  end

  def post_message(room, text, bot_sess, meta \\ nil) do
    start_typing(room, bot_sess)

    Process.sleep(:rand.uniform(1_000))

    {:ok, file_ids} = upload_metadata(meta, room.id, bot_sess)

    cmd = %Api.Message.Create{
      fromApp: "ai",
      roomId: room.id,
      fileIds: file_ids,
      text: text
    }

    {:reply, %Api.Message.Ok{messageId: message_id}} = Api.Message.info(cmd, bot_sess)

    stop_typing(room, bot_sess)

    {:ok, message_id}
  end

  defp upload_metadata(meta, room_id, bot_sess) do
    file_ids =
      case meta do
        nil ->
          []

        _ ->
          cmd = %Api.File.Upload{
            roomId: room_id,
            fileName: "meta.json",
            fileType: "application/json",
            binaryData: {0, "ignored"},
            metaData: meta
          }

          {:reply, %Fog.Api.File.Ok{fileId: file_id}} = Api.File.info(cmd, bot_sess)

          [file_id]
      end

    {:ok, file_ids}
  end

  def find_boundary_marker(room_id) do
    messages =
      Repo.Message.messages_younger_than(
        room_id: room_id,
        hours: @default_history_age_hours
      )

    messages
    |> Enum.find(&(&1.text |> String.starts_with?("$$$")))
  end

  def messages_to_marker(room_id: room_id, boundary_message_id: boundary_message_id) do
    messages =
      Repo.Message.messages_younger_than(
        room_id: room_id,
        hours: @default_history_age_hours
      )

    bottom_boundary_message = messages |> Enum.find(&(&1.text |> String.ends_with?(" $$$")))

    {recent, _} =
      messages
      |> Enum.split_while(&(&1.id !== boundary_message_id))

    top_boundary_message = messages |> Enum.find(&(&1.id === boundary_message_id))

    recent =
      if bottom_boundary_message do
        case recent |> Enum.split_while(&(&1.id !== bottom_boundary_message.id)) do
          {_, [_h | t]} ->
            t

          _ ->
            recent
        end
      else
        recent
      end

    [top_boundary_message | recent |> Enum.reverse()]
  end

  def recent_messages(room) do
    messages = Repo.Search.room_messages(%{room_id: room.id, term: nil, limit: 20})

    recent =
      case length(messages) < 5 do
        true ->
          messages

        false ->
          {_, _, pivot_msg} =
            messages
            |> Enum.reduce({nil, 0, nil}, fn msg, {prev, cur_max, cur_pivot_msg} ->
              case prev do
                nil ->
                  {msg, 0, msg}

                prev ->
                  %{inserted_at: prev_inserted_at} = prev
                  %{inserted_at: this_inserted_at} = msg

                  sec = DateTime.diff(prev_inserted_at, this_inserted_at)

                  case sec > cur_max do
                    true ->
                      {msg, sec, msg}

                    false ->
                      {msg, cur_max, cur_pivot_msg}
                  end
              end
            end)

          {recent, _} = messages |> Enum.split_while(&(&1.id !== pivot_msg.id))

          recent
      end

    recent |> Enum.reverse()
  end

  def get_bot_sess(ai_integration) do
    ai_integration = ai_integration |> Repo.preload(:workspace)
    integration_tag_name = Ai.integration_tag_name(ai_integration)
    bot_agent = Repo.Agent.get_bot_by_tag_name(ai_integration.workspace_id, integration_tag_name)
    {Api.Session.for_agent(ai_integration.workspace.vendor_id, bot_agent.id), ai_integration}
  end

  def last_x_chars(string, x) do
    length = String.length(string)
    start = length - x
    String.slice(string, start, x)
  end

  def trim_x_chars(string, x) do
    start = x
    length = String.length(string) - 2 * x
    String.slice(string, start, length)
  end

  def trim_list(list, x) do
    list
    |> Enum.drop(x)
    |> Enum.drop(-x)
  end

  def trim_content(messages) do
    trim_content(messages |> Enum.reverse(), 0, [])
  end

  def trim_content([], word_count, acc) when word_count < 1500 do
    acc |> Enum.reverse()
  end

  def trim_content(_, word_count, [h]) when word_count > 1500 do
    h
  end

  def trim_content(_, word_count, [_ | t]) when word_count > 1500 do
    t |> Enum.reverse()
  end

  def trim_content([h | t], word_count, acc) when word_count < 1500 do
    %{"content" => text} = h
    count = text |> String.split(" ") |> length

    trim_content(t, word_count + count, [h | acc])
  end
end
