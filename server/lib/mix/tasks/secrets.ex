defmodule Mix.Tasks.Secrets do
  use Mix.Task

  @moduledoc """
  Generate secrets when initializing project. For local development you can just keep them in local.env file.

  ## Usage

  `mix secrets ../local.env` - generate secrets and save them to local.env file
  `mix secrets - generate secrets and print them to stdout
  """

  def run(args) do
    print =
      case args do
        [] ->
          &IO.puts/1

        ["-"] ->
          &IO.puts/1

        [filename] ->
          # check if file exists
          if File.exists?(filename) do
            :ok = IO.puts("Generating new secrets and appending them to #{filename} file")
          else
            :ok = IO.puts("Creating a new #{filename} file and writing secrets to it")
            :ok = File.write(filename, "")
          end

          fn str ->
            {:ok, file} = File.open(filename, [:append])
            IO.binwrite(file, str <> "\n")
            File.close(file)
          end
      end

    if Application.started_applications()
       |> Enum.find(fn {app, _desc, _version} -> app === :libsalty2 end) === nil do
      :ok = Salty.Nif.load_nif()
    end

    generate_new_env_secrets(print)

    IO.puts("Done")
  end

  # run Fog.Utils.generate_new_env_secrets() and paste the output into your .env file
  def generate_new_env_secrets(print \\ &IO.puts/1) do
    # FOG_DETECTIVE_SECRET_KEY_BASE could be any string, it used to decrupt session cookies for "detectives" who are special super users accounts for the fogbender instance
    {:ok, detective_cookie_key_str} = Salty.Random.buf(64)
    print.("FOG_DETECTIVE_SECRET_KEY_BASE=#{Base.encode64(detective_cookie_key_str)}")

    # FOG_KEY_PREFIX is very similar to FOG_SECRET_KEY_BASE64, adds additional 16 bytes of entropy when we are using 32 byte keys
    {:ok, token_secret_prefix} = Salty.Random.buf(16)
    print.("FOG_KEY_PREFIX=#{Base.url_encode64(token_secret_prefix)}")

    # FOG_SECRET_KEY_BASE could be any string, it is used to decrypt session cookies
    {:ok, cookie_key_str} = Salty.Random.buf(64)
    print.("FOG_SECRET_KEY_BASE=#{Base.encode64(cookie_key_str)}")

    # FOG_SECRET_KEY_BASE64 is used to encrypt tokens that we are sending for things like email unsubscribe links, email verification tokens, etc. Must be 16 bytes
    {:ok, token_secret_key} = Salty.Random.buf(16)
    print.("FOG_SECRET_KEY_BASE64=#{Base.encode64(token_secret_key)}")
  end
end
