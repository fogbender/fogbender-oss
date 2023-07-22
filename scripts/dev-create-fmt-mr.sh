#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

# Get the name of the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if there are any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "There are uncommitted changes in the current directory. Please commit or stash them before running this script."
  exit 1
fi

# Check out the "chore--fmt" branch
git checkout chore--fmt

# Fetch and rebase the latest changes from main
git fetch origin
git rebase origin/main

# Run the "yarn fix" command
yarn fix

# Make a commit with a default commit message
if git commit -a -m "🎨 yarn fix" --author='Format Fairy <fmt@fogbender.com>'; then
  # Push the "chore--fmt" branch to remote
  git push origin chore--fmt:chore--fmt -f
  open "https://gitlab.com/fogbender/fogbender/-/merge_requests/new?merge_request%5Bsource_branch%5D=chore--fmt" || true
else
  echo "No changes to commit. Skipping push."
fi

# Return to the original branch
git checkout $CURRENT_BRANCH
