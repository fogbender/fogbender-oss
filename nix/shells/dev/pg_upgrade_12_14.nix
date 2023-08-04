{ writeScriptBin, bash, postgresql_12, postgresql_14 }:
writeScriptBin "pg_upgrade_12_14" ''
#!${bash}/bin/bash
#
# Upgrade dev database from PG12 to PG14
#
set -euo pipefail

echo "RUNNING from $PWD"

export PGBINOLD=${postgresql_12}/bin
export PGBINNEW=${postgresql_14}/bin

export PGDATAOLD=.nix-shell/db12
export PGDATANEW=.nix-shell/db14

mkdir -p $PGDATANEW
initdb -D $PGDATANEW --no-locale --encoding=UTF8
pg_upgrade --check
pg_upgrade
''
