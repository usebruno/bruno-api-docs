#!/usr/bin/env bash
# pages-preview.sh <pr-number> — publish a PR's current head as a QA build at
# https://usebruno.github.io/bruno-api-docs/pr-<n>/ by pushing the tag preview/pr-<n>.
# Needs write access to usebruno/bruno-api-docs. Re-run to publish the PR's latest commit.
set -euo pipefail

pr="${1:-}"
[[ "$pr" =~ ^[0-9]+$ ]] || { echo "usage: $0 <pr-number>"; exit 1; }

remote=$(git remote -v | awk '/github\.com[:\/]usebruno\/bruno-api-docs(\.git)? \(push\)/ { print $1; exit }')
[ -n "$remote" ] || { echo "no remote points at usebruno/bruno-api-docs"; exit 1; }

git fetch -q "$remote" "pull/$pr/head"
sha=$(git rev-parse FETCH_HEAD)
git ls-tree -r --name-only "$sha" .github/workflows | grep -qx '.github/workflows/qa-builds.yml' \
  || { echo "PR #$pr has no .github/workflows/qa-builds.yml yet; merge its release branch into it first"; exit 1; }

git push -q -f "$remote" "$sha:refs/tags/preview/pr-$pr"
echo "tagged preview/pr-$pr at ${sha:0:7}; build: https://github.com/usebruno/bruno-api-docs/actions/workflows/qa-builds.yml"
echo "live in a few minutes at https://usebruno.github.io/bruno-api-docs/pr-$pr/"
