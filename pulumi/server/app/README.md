# Elixir container for fogbender server

### Build image

Bundle up fogbender source code into docker image fogbender-server:

    ./pulumi/server/app/build.sh

### Start DB

Start database on host with:

    echo 'host    all             all             172.17.0.0/24           trust' >> .nix-shell/db/pg_hba.conf
    make db-start

or start one in docker:

    docker run --name fog-data -p 6543:5432 -e POSTGRES_DB=fogbender -e POSTGRES_USER=fogbender -e POSTGRES_PASSWORD=chae5thaiSooxei2ahMeaKei6TiTu6 -d postgres

### Start app

Start temp docker container with app:

    ./pulumi/server/app/run_rm.sh

or test your image with

    ./pulumi/server/app/run_rm.sh /bin/sh

    # apk add postgresql-client
    # psql -h 172.17.0.1 -p 6543 -U fogbender
