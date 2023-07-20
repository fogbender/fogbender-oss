{ writeScript, bash, fogbender }:
writeScript "fogbender-run" ''
#!${bash}/bin/bash
#
# Build and run the services locally
#
set -euo pipefail

export RELEASE_TMP="/tmp/fog"
export LANG="C.UTF-8"
export FOG_ENV="prod"
export FOG_PORT=8000
export FOG_IP="127.0.0.1"

export PG_PORT=6543
export PG_HOST="127.0.0.1"
export PG_USER="fogbender"
export PG_DB=$PG_USER
export PG_PASS=""

export URL=http://$FOG_IP:$FOG_PORT
frontend_url="http://$URL/"

${fogbender.server}/bin/fog-ctl migrate
${fogbender.server}/bin/fog start
''
