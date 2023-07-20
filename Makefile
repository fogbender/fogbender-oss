PG_DATA=.nix-shell/db14

PG_CTL=pg_ctl -D ${PG_DATA} -l "${PG_DATA}/server.log" -o "-h ${PG_HOST} -p ${PG_PORT} -k ."

.PHONY=all db-status db-start db-stop db-clean db-repl \
	     fog-deps fog-migrate fog-compile fog-repl fog-clean \
	     clean clean-all

all: db-start fog-repl

db-status:
	${PG_CTL} status

db-start: | ${PG_DATA}
	${PG_CTL} status || ${PG_CTL} start

${PG_DATA}:
	mkdir -p ${PG_DATA}
	initdb -D ${PG_DATA} --no-locale --encoding=UTF8
	${MAKE} db-start db-create db-stop

db-stop:
	${PG_CTL} status && ${PG_CTL} stop || exit 0

db-clean: db-stop
	rm -rf ${PG_DATA}

db-reset: db-clean db-start fog-migrate

db-create: db-start db-create-db

db-create-db:
	createuser -h ${PG_HOST} -p ${PG_PORT} ${PG_USER} --createdb --echo --superuser
	createdb -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}

db-update-user-role: db-start
	psql -c "ALTER ROLE ${PG_USER} SUPERUSER;" -h ${PG_HOST} -p ${PG_PORT} -d ${PG_DB}

db-repl: db-start
	psql -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} -d ${PG_DB}

fog-deps:
	cd server && mix deps.get

fog-deps-clean:
	cd server && mix deps.clean --unused --unlock

fog-deps-nix: fog-deps fog-deps-clean
	cd server && mix mix_to_json

fog-migrate: db-start
	cd server && mix ecto.migrate && mix ecto.dump -d ./priv/repo/db-dump.sql

fog-rollback: db-start
	cd server && mix ecto.rollback && mix ecto.dump -d ./priv/repo/db-dump.sql

fog-compile: fog-deps
	cd server && mix compile

fog-repl: fog-compile fog-migrate
	cd server && iex -S mix

fog-clean:
	cd server && mix clean

fog-format:
	cd server && mix format

fog-test: db-start
	cd server && MIX_ENV=test mix do ecto.create --quiet, ecto.migrate && mix test

fog-test-watch: db-start
	cd server && MIX_ENV=test mix do ecto.create --quiet, ecto.migrate && mix test.watch

fog-test-no-deps-check: db-start
	cd server && MIX_ENV=test mix ecto.migrate --no-deps-check && mix test --trace --no-deps-check

fog-test-wip-watch: db-start
	cd server && MIX_ENV=test mix do ecto.create --quiet, ecto.migrate && mix test.watch --only wip

fog-bump:
	scripts/calver bump "$$(cat server/VERSION)" > server/VERSION
	git add -- server/VERSION
	git commit -m "Fog $$(cat server/VERSION)"
	git tag -a "FOG-$$(cat server/VERSION)" -m "Fog version bump"

fog-agent-boot:
	$(eval agent_id := $(shell psql -c "select id from agent limit 1;" -t -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}))
	$(eval fogbender_vendor_id := $(shell psql -c "select id from vendor where name='Fogbender' limit 1;" -t -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}))
	psql -c "insert into vendor_agent_role (agent_id, vendor_id, role, updated_at, inserted_at) values ($(agent_id), $(fogbender_vendor_id), 'owner', now()::timestamp, now()::timestamp);" -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}

fog-detective-boot:
	$(eval agent_id := $(shell psql -c "select id from agent limit 1;" -t -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}))
	psql -c "insert into detective values ($(agent_id), (select email from agent where id='$(agent_id)'), (select name from agent where id='$(agent_id)'), now()::timestamp, now()::timestamp);" -h ${PG_HOST} -p ${PG_PORT} -U ${PG_USER} ${PG_DB}

fog-gettext:
	cd server && mix gettext.extract

web-start:
	yarn && yarn dev

web-format:
	yarn && yarn fmt

clean: fog-clean

clean-all: clean db-clean

format: web-format fog-format

vulnix:
	nix build '.#nixosConfigurations.api-prod.config.system.build.toplevel'
	vulnix ./result -D -w security/vulnix-exclude-erlang-libs.toml > security/vulnix.txt || exit 0
	rm result

nix-tree:
	nix-tree --derivation '.#nixosConfigurations.api-prod.config.system.build.toplevel'
