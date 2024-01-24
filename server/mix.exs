defmodule Fog.MixProject do
  use Mix.Project

  def project do
    [
      app: :fog,
      version:
        with v <- String.trim(File.read!("VERSION")),
             {:ok, _} <- Version.parse(v) do
          v
        else
          _ ->
            "0.0.0-epic-fail"
        end,
      elixir: "~> 1.9",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [fog: release()],
      elixirc_options: [warnings_as_errors: true],
      elixirc_paths: elixirc_paths(Mix.env())
    ]
  end

  def release do
    [
      include_erts: false,
      include_executables_for: [:unix]
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger],
      mod: {Fog.Application, []}
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:briefly, "~> 0.5"},
      {:configparser_ex, "~> 4.0"},
      {:corsica, "~> 1.0"},
      {:csv, "~> 2.3"},
      {:ecto_sql, "~> 3.11"},
      {:ex_aws, "~> 2.1.6"},
      {:ex_aws_s3, "~> 2.0"},
      {:ex_aws_ses, "~> 2.1"},
      {:ex_aws_sqs, "~> 3.3.1"},
      {:hackney, "~> 1.18.0"},
      {:cyanide, "~> 1.0"},
      {:jason, "~> 1.2"},
      {:joken, "~> 2.0"},
      {:joken_jwks, "~> 1.1.0"},
      {:mogrify, "~> 0.8.0"},
      {:paseto, "~> 1.3.0"},
      {:plug_cowboy, "~> 2.4"},
      {:postgrex, ">= 0.0.0"},
      {:recon, "~> 2.5"},
      {:snowflake, "~> 1.0"},
      {:sweet_xml, "~> 0.6"},
      {:tesla, "~> 1.8.0"},
      {:ueberauth_google, "~> 0.8"},
      {:ueberauth, "~> 0.6"},
      {:syn, "~> 2.1"},
      {:quantum, "~> 3.4"},
      {:timex, "~> 3.7"},
      {:html_entities, "~> 0.4"},
      {:phoenix_html, "~> 3.0"},
      {:hkdf, "~> 0.1.0",
       git: "https://github.com/mkurkov/hkdf.git",
       ref: "76261c4885035fcf73753183f169289afd27b81c",
       override: true},
      {:zbang, "~> 1.1.1"},

      # our fork with audio/x-m4a support
      {:mime, "~> 2.0",
       git: "https://github.com/mkurkov/mime.git",
       ref: "a86f09f0e374cf0a4f338bd063eafd896b3dba5e",
       override: true},
      {:neuron, "~> 5.0.0"},
      {:bamboo, "~> 2.0"},
      {:bamboo_ses, "~> 0.2.0"},
      {:gettext, "~> 0.19.1"},
      {:simple_markdown, "~> 0.8.2"},
      {:linkify, "~> 0.5"},
      {:iconv, "~> 1.0.10"},
      {:exmoji_fogbender, "~> 0.3"},
      {:ex_crypto,
       git: "https://github.com/ntrepid8/ex_crypto.git",
       ref: "0997a1aaebe701523c0a9b71d4acec4a1819354e"},
      {:floki, "~> 0.33.0"},
      {:earmark, "~> 1.4"},
      {:fast_html, "~> 2.0"},
      {:ssl_verify_fun, "~> 1.1.7"},

      # dev
      {:mix_test_watch, "~> 1.0", only: :dev, runtime: false},
      {:exsync, "~> 0.2",
       git: "https://github.com/mkurkov/exsync.git",
       ref: "45ff38ec7e6af9ad3a4fda50bf295da8864360b9",
       only: :dev},

      # enable for bench/markdown.exs
      # {:benchee, "~> 1.0", only: :dev},
      # {:md, "~> 0.9.4", only: :dev},
      # {:cmark, "~> 0.10.0", only: :dev},

      # test
      {:bypass, "~> 2.1", only: :test}
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]
end
