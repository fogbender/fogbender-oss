defmodule Mix.Tasks.Db.Seed do
  use Mix.Task

  alias Fog.{Repo, Data}

  alias Fog.Data.{
    Detective,
    Agent,
    Vendor
  }

  @shortdoc "Fills database with test data"

  @switches [
    count: :integer,
    detectives: :integer,
    agents: :integer,
    vendors: :integer,
    workspaces: :integer,
    customers: :integer,
    users: :integer,
    rooms: :integer,
    messages: :integer
  ]

  @aliases [
    c: :count
  ]

  @moduledoc """
  Fill database with test data

  By default it will create 5 entities for each type.
  Change this count either by providing `-c Count` switch or/and by setting counters individually with `--emails`,`--detectives`, `--agents`, `--vendors`, `--workspaces`, `--customers`, `--users` options.

  Generated emails will have form `detective123241234@example.com`, names - `Detective 12341234`
  Links between entities will be created randomly. Every vendor/workspace will have at least one customer with one owner.

  ## Examples

      mix db.seed
      mix db.seed -c=10
      mix db.seed --agents=20 --vendors=3 --customers=10 --workspaces=1

  ## Command line options

      * `-c`, `--count=Count` - default counter
      * `--detectives=Count`
      * `--agents=Count`
      * `--vendors=Count`
      * `--workspaces=Count`
      * `--customers=Count`
      * `--users=Count`
      * `--rooms=Count`
      * `--messages=Count`
  """

  @count 5

  def run(args) do
    {opts, _} = OptionParser.parse!(args, strict: @switches, aliases: @aliases)
    Logger.configure(level: :info)
    Application.ensure_all_started(:fog)

    opts
    |> gen(:detectives, &gen_detective/2)
    |> gen(:agents, &gen_agent/2)
    |> pgen(:vendors, &gen_vendor/2)
    |> info()
  end

  def gen(opts, type, fun) do
    c = count(type, opts)
    log("Generating #{c} #{type}")
    res = for num <- 1..c, do: fun.(opts, num)
    Keyword.put(opts, type, res)
  end

  def pgen(opts, type, fun) do
    c = count(type, opts)
    log("Generating #{c} #{type}")

    res =
      1..c
      |> Task.async_stream(fn num -> fun.(opts, num) end, timeout: 60000)
      |> Enum.to_list()
      |> Keyword.values()

    Keyword.put(opts, type, res)
  end

  defp gen_detective(_, _) do
    id = gen_id()
    email = gen_email("detective", id)
    name = gen_name("Detective", id)

    Detective.new(id: id, email: email, name: name)
    |> Repo.insert!()
  end

  defp gen_agent(_, _) do
    id = gen_id()
    email = gen_email("agent", id)
    name = gen_name("Agent", id)

    Agent.new(id: id, email: email, name: name)
    |> Repo.insert!()
  end

  defp gen_vendor(opts, _num) do
    id = gen_id()
    name = gen_name("Vendor", id)
    customers = vendor_customers(opts)

    Vendor.new(
      id: id,
      name: name,
      agents: vendor_agents(opts[:agents]),
      customers: customers,
      workspaces: vendor_workspaces(customers, opts)
    )
    |> Repo.insert!()
  end

  defp vendor_agents(agents) do
    roles = Stream.concat(["owner", "admin"], Stream.cycle(["agent"]))

    for {agent, role} <- Enum.zip(agents, roles) do
      %{agent_id: agent.id, role: role}
    end
  end

  defp vendor_customers(opts) do
    for _ <- 1..count(:customers, opts) do
      id = gen_id()
      %{id: id, name: "Customer #{id}", external_uid: "EXT_#{id}"}
    end
  end

  defp vendor_workspaces(customers, opts) do
    for _ <- 1..count(:workspaces, opts) do
      id = gen_id()

      %{
        id: id,
        name: "Workspace #{id}",
        signature_type: "jwt",
        signature_secret: Fog.UserSignature.generate_192bit_secret(),
        helpdesks: workspace_helpdesks(id, customers, opts)
      }
    end
  end

  defp workspace_helpdesks(wid, customers, opts) do
    for c <- customers do
      %{workspace_id: wid, customer_id: c.id, rooms: helpdesk_rooms(c, opts)}
    end
  end

  defp helpdesk_rooms(customer, opts) do
    for rnum <- 1..count(:rooms, opts) do
      %{
        name: "Room #{rnum} (#{customer.name})",
        type: "public",
        messages: room_messages(opts)
      }
    end
  end

  defp room_messages(opts) do
    for num <- 1..count(:messages, opts) do
      agent = take_one(opts[:agents])
      %{from_agent_id: agent.id, text: "MESSAGE #{num}"}
    end
  end

  defp gen_id() do
    {:ok, id} = Snowflake.next_id()
    id
  end

  defp gen_email(type, id) do
    "#{type}_#{id}@example.com"
  end

  defp gen_name(type, id) do
    "#{type} #{id}"
  end

  defp count(option, opts) do
    opts[option] || opts[:count] || @count
  end

  defp log(message) do
    IO.puts(message)
  end

  defp take_one(list) do
    Enum.take_random(list, 1)
    |> List.first()
  end

  defp info(opts) do
    log("")
    log("Detectives: ")
    for d <- opts[:detectives], do: log([" ", d.email])
    log("")
    log("Agents: ")
    for a <- opts[:agents], do: log([" ", a.email])
    log("")
    log("Vendors: ")

    for v <- opts[:vendors] do
      log([" ", v.name])
      log([" ", "Customers: #{length(v.customers)}"])
      log([" ", "Workspaces: #{length(v.workspaces)}"])

      for w <- v.workspaces do
        log(["  ", w.name, ", helpdesks: #{length(w.helpdesks)}, rooms: #{rooms_count(w)}"])
      end
    end
  end

  defp rooms_count(%Data.Workspace{} = w) do
    Enum.reduce(w.helpdesks, 0, fn h, acc -> acc + length(h.rooms) end)
  end
end
