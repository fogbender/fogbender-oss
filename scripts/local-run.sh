#!/bin/sh -e

cd "$(dirname "$0")/.."

cmd="nix-build -A scripts.run --no-out-link"
$cmd
$($cmd)
