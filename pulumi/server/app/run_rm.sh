#!/usr/bin/env bash

cd -- "${0%/*}"

docker run --env-file=./docker-dev.env -v $(pwd):/wdr --rm -it -p 8000:8000 fogbender-server $@
