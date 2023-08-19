# Fogbender

## Customer support for companies that sell complex products to technical teams

See also:

- [Initialization](Initialization.md) for application setup once the steps in this document are complete.

## Preparation

### [Nixpkgs install](https://nixos.org/nix/download.html)

    > curl -L https://nixos.org/nix/install | sh

### Nix on macOS Catalina (10.15)

Use [this workaround](https://github.com/NixOS/nix/issues/2925#issuecomment-539570232). Also see [this](https://github.com/NixOS/nix/issues/3125).

If you see the following error:

`bash: warning: setlocale: LC_COLLATE: cannot change locale (C.UTF-8): No such file or directory`

Add the following to ~/.bashrc

```
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
```

## Nix shell

    > nix-shell

First run will install Elixir, Postgres, Node, Yarn and other deps into Nix store, so it could take some time.
Next runs should immediately open shell with all apps accessible.
Also it is possible to run isolated shell with restricted environment:

    > nix-shell --pure

## Fast start

1. Open nix shell: `nix-shell`

2. Run `make` - it will create/start local DB, build web assets, compile fog server,
   migrate DB and start server with repl.
   To be sure you use last web assets (after git pull for example), use clean: `make clean all`.

By default site should be accessible on http://localhost:8000 url.

To clean not only compiled files, but also database use `make clean-all` command.

## Database for development

Run from `nix-shell`:

- Start: `make db-start` - it will initialize local database if needed and start it
- Stop: `make db-stop`
- Clean: `make db-clean`

Commands work with local instance of PostgreSQL database. For shell database access, run `make db-repl`.

To fill database with test data use `mix db.seed` task:

    > (cd server && mix db.seed -c=2 --agents=10)

It has several options to control count of objects created, see docs with `h Mix.Tasks.Db.Seed`.

## Server development

Run from `nix-shell`:

`make fog-repl` - it will compile, migrate and start server with repl.

Note: to generate migration files, see https://hexdocs.pm/ecto/2.1.4/Mix.Tasks.Ecto.Gen.Migration.html

- Migrate: `make fog-migrate`
- Compile: `make fog-compile`
- Get deps: `make fog-deps`
- Clean: `make fog-clean`
- Bump version: `make fog-bump`

Any other `mix` commands are available from `./server` directory.

Configuration currently loaded from `./config/dev.nix` file. It is exported as env variables on `nix-shell` load.

### Testing

There are several `make` commands that simplify running tests:

- Run all tests: `make fog-test`
- Run all tests and watch: `make fog-test-watch`
- Run all tests in a file: `(cd server/ && mix test test/api/integration_test.exs)`
- Run a specific test: `(cd server/ && mix test test/api/integration_test.exs:109)`

During development you can mark currently developed tests with `:wip` tag:

    @tag :wip
    test "Some new test" do
    ...

And run only them with `make fog-test-wip-watch` command.

### Versioning

Fog server uses calendar versioning (calver) with format: YYYY.MM.Z, where YYYY - year, MM - month without leading zero, Z - patch number in current month.
Current version is kept in `server/VERSION` file. To check version on fog installation run `fog version` command.
New version created automatically by Gitlab CI when some server changes merged to master branch. It creates new commit with `server/VERSION` update and tag it
with FOG-YYYY.MM.Z tag. When new tag placed, CI deploys it to staging.

To create new version manually, checkout master and run `make fog-bump` command, it will update `server/VERSION` and create `FOG-YYYY.MM.Z` tag.
Review changes and push it to master with `git push master --tags` command.

## Adding Elixir dependencies to nix

1. Add/remove deps as usual to mix.exs.
2. Then from `nix-shell` run `make fog-deps fog-deps-nix`.
   Last command will sync deps.json file with mix.lock.
3. Commit changes to both mix.exs and deps.json to repository.

## Web

Requirements:

- node v18.12.1
- [Tailwind plugin for VSCode](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

Build:

    yarn

Start all apps at the same time:

    yarn start

Or

    nix-shell --run 'make web-start'

Now you can open:

- http://localhost:3100/ for storefront, i.e. fogbender.com
- http://localhost:3200/ for vendor demo
- http://localhost:3300/ for fogbender client ui

### On a phone

To test the web UI on a second device during development, you'll need to specify the server IP instead of using `localhost`.

Note that third-party signin will not work — only email/password (aka Cognito).

#### Server

edit `vi local.env` and add this (requires `nix-shell` restart):

    export FOG_IP="<server_ip>"
    export FOG_IP="192.168.1.2" # example

#### Client

In the interactive nix shell (after `nix-shell --pure`):

```
PUBLIC_API_SERVER_URL=http://<server_ip>:8000
PUBLIC_CLIENT_WIDGET_URL=http://<server_ip>:3300
yarn start
```

Or, as a single command:

```
nix-shell --pure --run "PUBLIC_API_SERVER_URL=http://<server_ip>:8000 PUBLIC_CLIENT_WIDGET_URL=http://<server_ip>:3300 yarn start"
```

Now open http://<server_ip>:3100/ from your phone. Make sure to add `http://<server_ip>:3100` to "secure" domains [in chrome](https://stackoverflow.com/a/54934302/74167) in order to use notifications.

## Deploying Web

Deployment is done with branches (not tags):

- staging-client
- staging-storefront
- staging-vendordemo

Example of deploying storefront:

    git fetch
    git checkout staging-storefront
    git rebase origin/master
    git push origin staging-storefront

To monitor the build process, go here: [https://app.netlify.com/teams/fogbender/builds/](https://app.netlify.com/teams/fogbender/builds/)

Also see docs/Deploy.md and docs/Release.md

## Mobile (react-native & expo)

Make sure you have globally installed `expo-cli`:

    yarn global add expo-cli

Then go to `mobile` folder, update dependencies and start expo's metro server:

    cd mobile
    yarn
    yarn start

Follow instructions on screen. To test local version you need AndroidStudio or XCode installed.

`fogbender-proto` is added as published package. If you want to edit proto library while developing mobile, then start watching it:

    cd packages/fogbender-proto
    yarn start

After that, you need to override installed version and update it live:

    cd mobile
    rm -rf node_modules/fogbender-proto/
    npx cpx -w -v "../packages/fogbender-proto/**/*.*" node_modules/fogbender-proto/

## Nix packages

`default.nix` in root directory defines several attributes that could be used to create Fogbender derivations.
They can be built with nix-build and then used to run services with command:

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

SSH to staging server:

- `ssh fogbender@api.fogbender-test.com`

Access Elixir console:

- `fog remote`

Remote database access from dev admin:

- `scripts/db-test repl`- opens psql shell connected to test database
- `scripts/db-prod repl`- opens psql shell connected to prod database

Also available commands are:

- `report`report.sql` - runs report and outputs result in csv format to stdin.
- `psql ...` - runsq psql on remote with commands/options provided.

Your local machine should have ssh access to api host and secrets folder.

Examples:

- `scripts/db-test psql -c "select count(*) from message;"`
- `scripts/db-test psql -f reports/stats.sql -F ',' -A `
- `scripts/db-test report reports/stats.sql > /tmp/stats.csv`

## Secrets

See docs/Secrets.md

## Building MS Teams packages

- DEV: `(cd server/lib/fog/comms/msteams/dev && zip -j Fogbender-DEV.zip ../color.png manifest.json ../outline.png)`
- TEST: `(cd server/lib/fog/comms/msteams/test && zip -j Fogbender-TEST.zip ../color.png manifest.json ../outline.png)`
- PROD: `(cd server/lib/fog/comms/msteams/prod && zip -j Fogbender-PROD.zip ../color.png manifest.json ../outline.png)`

## Benchmarking

Benchmark scripts are placed in `server/bench` directory.
To run it, call `mix run`:

    (cd server && mix run --no-start bench/markdown.exs)
