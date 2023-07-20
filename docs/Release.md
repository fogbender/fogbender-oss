## Building and running server release

From normall shell:

1. cd some-temp-dir
2. nix-build /path/to/fogbender_repo -A fogbender.server

(2) will build Fogbender server derivation and install it into /nix/store
It will leave `result` directory in current dir symlinked to /nix/store/xxx path:

    readlink result
    ~ /nix/store/xxx....

Now we need to provide server config parameters. We can create test.env file with them:

    cat test.env:

    export RELEASE_TMP="/tmp/fog"
    export LANG="C.UTF-8"
    export FOG_ENV="prod"
    export FOG_PORT=8000
    export FOG_IP="127.0.0.1"
    export PG_PORT=6543
    export PG_HOST="127.0.0.1"
    export PG_USER="fogbender"
    export PG_DB=$PG_USER

Be sure that postgresql server is running: `make db-start` from nix-shell in fogbender repo.
Start server like this:

    (source test.env && result/bin/fog start_iex)

To migrate database run

    (source test.env && result/bin/fog-ctl migrate)
