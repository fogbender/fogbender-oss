#!/usr/bin/env bash

echo "Checking Fog version.."
vsnC=$(cat server/VERSION)
vsnM=$(git show origin/main:server/VERSION)
vsnM=${vsnM:-"0.0.0"}
echo "Master: ${vsnM}"
echo "Current: ${vsnC}"
git diff origin/main --quiet -- server && echo "No server changes" || \
        (echo -e "${vsnM}\n${vsnC}" | sort -V -C -u) && echo "OK" || \
        (echo "Please update Fog version"; exit 1)
