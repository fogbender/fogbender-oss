![Fogbender log](storefront/src/assets/logomark.svg)

(This is our pre-open-source README - intended for folks who work at Fogbender.)

See also:

- [Initialization](Initialization.md) for application setup once the steps in this document are complete.

## Install Nix

### [Nixpkgs install](https://nixos.org/nix/download.html)

    > curl -L https://nixos.org/nix/install | sh

### Enable [Flakes](https://nixos.wiki/wiki/Flakes):

```
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
```

## Start Nix shell

    > nix develop

> If you see the following error:

> `bash: warning: setlocale: LC_COLLATE: cannot change locale (C.UTF-8): No such file or directory`

> Add the following to ~/.bashrc

```
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

The first run will install Elixir, Postgres, Node, Yarn and other deps into Nix store, so it could take some time.

Next runs should immediately open a shell with all the apps accessible.

## Fast start

1. Start Nix shell: `nix develop`

2. Run `make` to:

- Create/start local DB, build web assets, compile fog server
- Migrate DB and start server with repl

Visit http://localhost:8000/public/about - it should show something like

```
{
  "version": "2023.8.16"
}
```

To be sure you use the latest web assets (after git pull for example), run `make clean all`

To clean not only compiled files, but also the database, use the `make clean-all` command. Note: it will wipe all data from the database.

## Database for development

Run from `nix develop`:

- Start: `make db-start` - it will initialize local database, if needed, and start it
- Stop: `make db-stop` - stop the local database
- Clean: `make db-clean` - delete data from the local database

For database access with `psql`, run `make db-repl`.

To fill the database with test data, use the `mix db.seed` task:

    > (cd server && mix db.seed -c=2 --agents=10)

There are several options to control the count of objects created: to see the docs, run `h Mix.Tasks.Db.Seed` in the Elixir shell.

## Server development

Run from `nix develop`:

`make fog-repl` - compile, migrate, and start the server with repl

Note: to generate migration files, see https://hexdocs.pm/ecto/2.1.4/Mix.Tasks.Ecto.Gen.Migration.html

Available commands:

- Migrate: `make fog-migrate`
- Compile: `make fog-compile`
- Get deps: `make fog-deps`
- Clean: `make fog-clean`
- Bump version: `make fog-bump`

Other `mix` commands (e.g., `test`) are available from the `./server` directory.

Configuration is loaded from the `./config/dev.nix` file - its contents are exported as env variables on `nix develop` load.

### Testing

There are several `make` commands that simplify the running of tests:

- Run all tests: `make fog-test`
- Run all tests and watch: `make fog-test-watch`
- Run all tests in a file: `(cd server/ && mix test test/api/integration_test.exs)`
- Run a specific test: `(cd server/ && mix test test/api/integration_test.exs:109)`

During development, you can mark tests currently being developed with a `:wip` tag:

    @tag :wip
    test "Some new test" do
    ...

To run `:wip` tests only, use the `make fog-test-wip-watch` command.

### Versioning

Fog server uses calendar versioning (calver) with format: YYYY.MM.Z, where YYYY - year, MM - month without the leading zero, Z - patch number in the current month.

The current version is kept in `server/VERSION` file. To check the version on a Fogbender installation, run the `fog version` command.

New versions are created automatically by the GitLab CI when changes changes inside the `server` directly are merged to the main branch: it creates a new commit updating the `server/VERSION` file, and tags the commit with a `FOG-YYYY.MM.Z` tag. When a new tag is created, CI triggers a deployment to the test environment.

To create a new version manually, run `make fog-bump` from `main` to update the `server/VERSION` file and create the `FOG-YYYY.MM.Z` tag.

Review changes and push to `main` with `git push main --tags` command.

## Adding Elixir dependencies to Nix

1. Add/remove deps as usual to mix.exs.
2. Then from `nix develop` run `make fog-deps fog-deps-nix`.
   The second command will sync the `deps.json` file with `mix.lock`.
3. Commit changes to both mix.exs and deps.json to the repository.

## Web

You can run the web part without Nix.

Requirements:

- Node v18.12.1
- [Tailwind plugin for VSCode](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

Build:

    yarn

Start all webapps at the same time:

    yarn start

Or, with Nix:

    nix develop -c make web-start

Now you can open:

- http://localhost:3100/ for storefront, i.e. local version of fogbender.com
- http://localhost:3200/ for vendor demo
- http://localhost:3300/ for Fogbender client UI

For developing integrations, install Ngrok and start it with

    ngrok http 8000

Then, start the frontend with

    yarn && PUBLIC_HOOK_URL="https://fbbc-75-111-56-87.ngrok-free.app/hook" yarn dev

## Deploying Web

Deployment is done with branches (not tags):

### Test (fogbender-test.com)

- staging-client
- staging-storefront
- staging-vendordemo

Note that the "staging" prefix in the above branches is a historical misnomer.

### Production (fogbender.com)

- production-client
- staging-storefront
- staging-vendordemo

Example of deploying storefront to the Test environment:

    git fetch
    git checkout staging-storefront
    git rebase origin/master
    git push origin staging-storefront

To monitor the build process, go here: [https://app.netlify.com/teams/fogbender/builds/](https://app.netlify.com/teams/fogbender/builds/)

Also see docs/Deploy.md and docs/Release.md

## Nix packages

`default.nix` in the repo root defines several attributes that can be used to create Fogbender derivations.
They can be built with `nix-build` and then used to run services with command:

    nix-build /path/to/fogbender -A some.attribute`

Result of building is placed somewhere in `/nix/store/xxx` directory. For convenience local symlink `result` is created.

Attributes:

- `fogbender.server` - Fog server
- `fogbender.client` - Fog client
- `fogbender.storefront` - landing page
- `fogbender.vendor` - vendor demo
- `scripts.run` - script to start local version of Fog server with Client web app from /nix/store.

To run local script, just build it and run the result :

    nix-build /path/to/fogbender -A scripts.run && ./result

Or just call `/path/to/fogbender/scripts/local-run.sh` script. It will run both steps above without intermediate result folder.

Database should be started in advance (possibly from nix-shell with `make db-start`).

## Remote access

SSH to test/production servers:

- `ssh fogbender@api-test.fogbender.net -J root@portal.fogbender.com`
- `ssh fogbender@api-prod.fogbender.net -J root@portal.fogbender.com`

Access Elixir console:

- `fog remote`

Remote database access from dev admin:

- `scripts/db-test repl`- opens psql shell connected to test database
- `scripts/db-prod repl`- opens psql shell connected to prod database

Other commands:

- `report <report>.sql` - runs report and outputs result in csv format to stdin
- `psql ...` - runsq psql on remote with commands/options provided

For this to work, your local machine should have ssh access to api host and secrets directory.

Examples:

- `scripts/db-test psql -c "select count(*) from message;"`
- `scripts/db-test psql -f reports/stats.sql -F ',' -A `
- `scripts/db-test report reports/stats.sql > /tmp/stats.csv`

## Secrets

See [docs/Secrets.md](docs/Secrets.md)

## Building MS Teams packages

- DEV: `(cd server/lib/fog/comms/msteams/dev && zip -j Fogbender-DEV.zip ../color.png manifest.json ../outline.png)`
- TEST: `(cd server/lib/fog/comms/msteams/test && zip -j Fogbender-TEST.zip ../color.png manifest.json ../outline.png)`
- PROD: `(cd server/lib/fog/comms/msteams/prod && zip -j Fogbender-PROD.zip ../color.png manifest.json ../outline.png)`

## Benchmarking

Benchmark scripts are placed in `server/bench` directory.
To run it, call `mix run`:

    (cd server && mix run --no-start bench/markdown.exs)
