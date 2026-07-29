#!/usr/bin/env sh
# `changeset add` names files with a random word triplet. Rename the new one
# after the current branch so the pending changesets are readable at a glance.
set -e

before=$(mktemp)
ls .changeset/*.md 2>/dev/null | sort > "$before"

npx changeset "$@"

new=$(ls .changeset/*.md 2>/dev/null | sort | grep -vxF -f "$before" | head -1)
rm -f "$before"
[ -n "$new" ] || exit 0

slug=$(git rev-parse --abbrev-ref HEAD \
  | tr '[:upper:]' '[:lower:]' \
  | sed -e 's#[^a-z0-9]#-#g' -e 's#--*#-#g' -e 's#^-##' -e 's#-$##')

target=".changeset/$slug.md"
n=2
while [ -e "$target" ]; do
  target=".changeset/$slug-$n.md"
  n=$((n + 1))
done

mv "$new" "$target"
echo "changeset: $target"
