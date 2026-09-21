#!/usr/bin/env bash
# Try the packages in a real app before they are on npm. Builds, packs the tarballs, installs the
# core and one wrapper into the app exactly as npm would, and prints the mount to add.
#
#   npm run try -- ~/code/my-api express       install into that app (express | fastify | nestjs)
#   npm run try -- ~/code/my-api --remove      uninstall again, leaving the app as it was
#
# Nothing is linked: the packages are copied into the app's node_modules with file: entries in
# its package.json, so --remove is a plain npm uninstall.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-}"
WHAT="${2:-}"
PACKAGES="@usebruno/api-docs-core @usebruno/api-docs-express @usebruno/api-docs-fastify @usebruno/api-docs-nestjs"

usage() { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
[ -n "$APP" ] && [ -n "$WHAT" ] || usage
[ -f "$APP/package.json" ] || { echo "no package.json in $APP" >&2; exit 2; }

if [ "$WHAT" = "--remove" ]; then
  installed=""
  for p in $PACKAGES; do
    grep -q "\"$p\"" "$APP/package.json" && installed="$installed $p"
  done
  [ -n "$installed" ] || { echo "nothing of ours is installed in $APP"; exit 0; }
  # shellcheck disable=SC2086
  ( cd "$APP" && npm uninstall $installed )
  echo "removed:$installed"
  exit 0
fi

case "$WHAT" in express | fastify | nestjs) ;; *) usage ;; esac

# the app's package.json will point at these by path, so they stay in the checkout, not in a temp dir
( cd "$ROOT" && npm run build --silent )
TARBALLS="$ROOT/dist-tarballs"
mkdir -p "$TARBALLS"
for p in core "$WHAT"; do
  ( cd "$ROOT/nodejs/$p" && npm pack --silent --pack-destination "$TARBALLS" >/dev/null )
done

# one install for both, so the wrapper's exact pin on the core resolves from the tarball beside it
( cd "$APP" && npm install --no-audit --no-fund "$TARBALLS"/*api-docs-core*.tgz "$TARBALLS"/*api-docs-"$WHAT"*.tgz )
echo
echo "installed @usebruno/api-docs-core and @usebruno/api-docs-$WHAT into $APP"
echo
echo "add the mount. The collection path is relative to your entry file, not the cwd;"
echo "for a built Nest app that is dist/main.js, so count from dist/."
echo
case "$WHAT" in
  express)
    echo "  const { apiDocs } = require('@usebruno/api-docs-express');"
    echo "  app.use('/docs', apiDocs({ collectionPath: './api-collection' }));"
    ;;
  fastify)
    echo "  const { apiDocs } = require('@usebruno/api-docs-fastify');"
    echo "  app.register(apiDocs, { prefix: '/docs', collectionPath: './api-collection' });"
    ;;
  nestjs)
    echo "  import { ApiDocsModule } from '@usebruno/api-docs-nestjs';"
    echo "  @Module({ imports: [ApiDocsModule.forRoot({ collectionPath: '../api-collection' })] })"
    ;;
esac
echo
echo "then open http://localhost:<port>/docs/. If the app sets a CSP, script-src needs"
echo "https://cdn.usebruno.com and 'wasm-unsafe-eval', and connect-src needs data:."
echo "to undo: npm run try -- $APP --remove"
