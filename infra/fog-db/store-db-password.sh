#!/usr/bin/env sh

stack=`pulumi stack --show-name`
envFile=../../nix/deploy/secrets/${stack}/fogbender.env
echo reading PG_PASS from $envFile

if [ -f "$envFile" ]; then
    sops exec-env ${envFile} 'echo ${PG_PASS} | xargs pulumi config set --secret dbPassword'
    echo
    echo "DONE."
    pulumi config
else
    echo "ERROR: $envFile does not exist."
    exit 1
fi
