#!/usr/bin/env bash
# Publish shape, without a registry. Packs every package, installs the tarballs into a clean
# directory next to a copy of an example, and runs the contract suite there. This is what catches
# a missing `files` entry, a runtime dependency declared as a dev one, or shell.js left out of the
# tarball, before a publish does.
#
#   bash nodejs/scripts/pack-and-install.sh [--port 5460]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT=5460
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "== pack"
mkdir -p "$TMP/tarballs"
for pkg in core express fastify nestjs; do
  ( cd "$ROOT/nodejs/$pkg" && npm pack --silent --pack-destination "$TMP/tarballs" >/dev/null )
done
ls "$TMP/tarballs" | sed 's/^/  /'

echo "== the core ships the shell, or nothing can boot"
tar -tzf "$TMP"/tarballs/*api-docs-core*.tgz | grep -q 'package/shell/shell.js' || { echo "  shell.js is NOT in the core tarball" >&2; exit 1; }
tar -tzf "$TMP"/tarballs/*api-docs-core*.tgz | grep -q 'package/shell/shell.html' || { echo "  shell.html is NOT in the core tarball" >&2; exit 1; }
echo "  both present"

echo "== install the tarballs into a clean directory"
APP="$TMP/app"
mkdir -p "$APP"
cat >"$APP/package.json" <<JSON
{
  "name": "pack-check",
  "private": true,
  "version": "0.0.0"
}
JSON
# the frameworks come from the registry on purpose: a runtime dependency we forgot to declare
# fails here and nowhere else, because the workspace would have hoisted it
( cd "$APP" && npm install --silent --no-audit --no-fund \
    "$TMP"/tarballs/*api-docs-core*.tgz \
    "$TMP"/tarballs/*api-docs-express*.tgz \
    express helmet >/dev/null )
echo "  installed from tarballs, with express and helmet from the registry"

echo "== the installed core carries its shell"
test -f "$APP/node_modules/@usebruno/api-docs-core/shell/shell.js" || { echo "  shell.js missing after install" >&2; exit 1; }
echo "  node_modules/@usebruno/api-docs-core/shell/shell.js"

echo "== run the example against the installed packages"
mkdir -p "$APP/example"
cp "$ROOT/nodejs/express/example/server.js" "$APP/example/server.js"
cp -R "$ROOT/contract-tests/fixtures" "$APP/fixtures"

COLLECTION="../fixtures/api-collection" BUNDLED="../fixtures/bundled.yml" \
  bash "$ROOT/contract-tests/check.sh" --example "$APP/example/server.js" --port "$PORT"
