#!/usr/bin/env bash

cd -- "${0%/*}"

(cd ../; rsync --delete-excluded --exclude=_build --exclude=deps -r ../../server/ app/fog/)

docker build -f Dockerfile -t fogbender-server .
