#!/usr/bin/env bash

set -euxo pipefail

TARGET="aws-demo"
SPEC=nix/deploy/demo/aws-demo.nix

PROFILE_PATH="$(nix-build --no-out-link $SPEC)"
nix-copy-closure --to --use-substitutes $TARGET $PROFILE_PATH
ssh $TARGET -- "nix-env --profile /nix/var/nix/profiles/system --set $PROFILE_PATH && /nix/var/nix/profiles/system/bin/switch-to-configuration switch"
