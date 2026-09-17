#!/usr/bin/env bash
# The HTTP contract every wrapper, in every framework, in every language must satisfy.
# Boots one example, asserts from outside it, exits non-zero on any miss.
#
#   bash contract-tests/check.sh --example nodejs/express/example/server.js --port 5456
#   bash contract-tests/check.sh --example ... --save /tmp/express      keep the served bodies
#   bash contract-tests/check.sh --example ... --compare /tmp/express   diff bodies against a run
#
# Every example serves the same five mounts over the same fixture. That convention is what makes
# one script cover the whole matrix: a cell is an invocation, not an edit.
#
#   /docs          environments include Local, tags exclude internal, pageTitle, gitCollectionUrl
#   /api/v2/docs   environments all minus Prod
#   /internal/docs no options
#   /bundled/docs  a single bundled yml
#   /broken/docs   a collection that is not there
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLE=""
PORT=5456
SAVE=""
COMPARE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --example) EXAMPLE="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --save) SAVE="$2"; shift 2 ;;
    --compare) COMPARE="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$EXAMPLE" ] || { echo "--example is required" >&2; exit 2; }
case "$EXAMPLE" in /*) ;; *) EXAMPLE="$ROOT/$EXAMPLE" ;; esac
[ -f "$EXAMPLE" ] || { echo "no example at $EXAMPLE" >&2; exit 2; }

BASE="http://localhost:$PORT"
TMP="$(mktemp -d)"
# stderr goes first: the shell announces a killed background job, and that reads like a failure
trap 'exec 2>/dev/null; pkill -P "${SERVER_PID:-0}" || true; kill "${SERVER_PID:-0}" || true; rm -rf "$TMP"' EXIT

pass=0
fail=0
check() {
  local name=$1
  shift
  if "$@"; then
    pass=$((pass + 1))
    printf '  ok   %s\n' "$name"
  else
    fail=$((fail + 1))
    printf '  FAIL %s\n' "$name"
  fi
}

# ---- helpers: each asserts exactly one fact ---------------------------------

status_is() { [ "$(curl -s -o /dev/null -w '%{http_code}' "${@:2}")" = "$1" ]; }
header_of() { curl -s -D - -o /dev/null "${@:2}" | tr -d '\r' | awk -v k="$1" 'tolower($1)==tolower(k":"){sub(/^[^:]*: */,"");print}'; }
header_has() { local name=$1 want=$2; shift 2; header_of "$name" "$@" | grep -q "$want"; }
header_absent() { local name=$1; shift; [ -z "$(header_of "$name" "$@")" ]; }
body_has() { curl -s "$1" | grep -q "$2"; }
body_lacks() { ! curl -s "$1" | grep -Eq "$2"; }
file_has() { grep -q "$2" "$1"; }
file_lacks() { ! grep -q "$2" "$1"; }
revalidates() { status_is 304 -H "If-None-Match: $(header_of ETag "$1")" "$1"; }
redirects_to() { status_is 301 "$1" && [ "$(header_of Location "$1")" = "$2" ]; }
paths_in() { node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.keys(d.files).sort().join(","))' "$1"; }
paths_are() { [ "$(paths_in "$1")" = "$2" ]; }
none_mention() { ! grep -q "$1" "${@:2}"; }
no_origins() { ! grep -oE 'https?://[A-Za-z0-9./_-]+' "$1" | grep -q .; }
config_of() { curl -s "$1" | grep -o 'data-config="[^"]*"'; }
config_lacks() { ! config_of "$1" | grep -Eq "&quot;($2)&quot;:"; }

# ---- boot, from a different cwd on purpose ---------------------------------

# a leftover server on this port would answer every assertion, and the suite would be grading
# the wrong process. Say so once, instead of failing fifty times.
if curl -s -o /dev/null --max-time 1 "$BASE/control"; then
  echo "port $PORT is already serving something. Stop it, or pass --port." >&2
  exit 2
fi

( cd "$TMP" && PORT="$PORT" node "$EXAMPLE" >"$TMP/server.log" 2>&1 ) &
SERVER_PID=$!
for _ in $(seq 1 60); do curl -s -o /dev/null "$BASE/control" && break; sleep 0.1; done
curl -s -o /dev/null "$BASE/control" || { echo "server did not start"; cat "$TMP/server.log"; exit 1; }
echo "booted $(basename "$(dirname "$(dirname "$EXAMPLE")")")/$(basename "$EXAMPLE") on :$PORT from $TMP"

# ---- the routes, identical at every mount ----------------------------------

for MOUNT in /docs /api/v2/docs /internal/docs; do
  echo "== $MOUNT"
  url="$BASE$MOUNT"
  last="${MOUNT##*/}"
  saved="${MOUNT//\//_}"

  check "$MOUNT -> 301 to relative '$last/'"                  redirects_to "$url" "$last/"
  check "$MOUNT/ -> text/html"                                 header_has Content-Type text/html "$url/"
  check "$MOUNT/ -> no-cache, it carries the mount base"       header_has Cache-Control no-cache "$url/"
  check "$MOUNT/ no inline script"                             body_lacks "$url/" '<script>|<script[^>]*>[^<]'
  check "$MOUNT/ no inline style"                              body_lacks "$url/" '<style'
  check "$MOUNT/ loads shell.js from the mount, same origin"   body_has "$url/" "src=\"$MOUNT/shell.js\""
  check "$MOUNT/<deep>/ serves the shell with the mount base"  body_has "$url/catalog/list-products/" "data-base=\"$MOUNT/\""
  check "$MOUNT/shell.js -> javascript"                        header_has Content-Type javascript "$url/shell.js"
  check "$MOUNT/shell.js -> public, max-age=3600"              header_has Cache-Control 'public, max-age=3600' "$url/shell.js"
  check "$MOUNT/shell.js -> 304 on If-None-Match"              revalidates "$url/shell.js"
  check "$MOUNT/collection.yml -> no-store"                    header_has Cache-Control no-store "$url/collection.yml"
  check "$MOUNT/collection.yml -> nosniff"                     header_has X-Content-Type-Options nosniff "$url/collection.yml"
  check "$MOUNT/collection.yml -> 304 on If-None-Match"        revalidates "$url/collection.yml"
  check "$MOUNT/collection.yml -> no Last-Modified"            header_absent Last-Modified "$url/collection.yml"
  check "$MOUNT/ POST -> 405"                                  status_is 405 -X POST "$url/"
  check "$MOUNT/ POST -> Allow: GET, HEAD"                     header_has Allow 'GET, HEAD' "$url/" -X POST
  check "$MOUNT/ HEAD -> 200"                                  status_is 200 -I "$url/"

  curl -s "$url/collection.yml" >"$TMP/coll$saved.json"
  curl -s "$url/shell.js" >"$TMP/shell$saved.js"
done

echo "== shell.js is one file, whatever the mount"
check "byte-identical across mounts"            cmp -s "$TMP/shell_docs.js" "$TMP/shell_api_v2_docs.js"
check "byte-identical across mounts (2)"        cmp -s "$TMP/shell_docs.js" "$TMP/shell_internal_docs.js"
check "no origin is baked into the bundle"      no_origins "$TMP/shell_docs.js"
check "it understands the fragments envelope"   file_has "$TMP/shell_docs.js" 'opencollection-fragments'

echo "== environments: server side, by whole file"
check "/docs include Local -> exactly Local"    file_has "$TMP/coll_docs.json" 'environments/Local.yml'
check "/docs -> no other environment"           file_lacks "$TMP/coll_docs.json" 'environments/Prod.yml'
check "/api/v2 all minus Prod -> Local only"    file_has "$TMP/coll_api_v2_docs.json" 'environments/Local.yml'
check "/api/v2 -> Prod file absent"             file_lacks "$TMP/coll_api_v2_docs.json" 'environments/Prod.yml'
check "/internal default -> no environments"    file_lacks "$TMP/coll_internal_docs.json" 'environments/'
check "Prod's token appears in no served byte"  none_mention 'prod-token-must-never-be-served' "$TMP"/coll_*.json "$TMP"/shell_docs.js

echo "== tags: server side, by whole file, folders pruned behind them"
check "/docs -> the tagged request is gone"     file_lacks "$TMP/coll_docs.json" 'reindex catalog'
check "/docs -> its URL literal is gone too"    file_lacks "$TMP/coll_docs.json" 'admin/reindex-catalog'
check "/docs -> a folder with no survivor goes" file_lacks "$TMP/coll_docs.json" 'internal/folder.yml'
check "/docs -> a folder with one survives"     file_has "$TMP/coll_docs.json" 'mixed/folder.yml'
check "/docs -> and keeps its survivor"         file_has "$TMP/coll_docs.json" 'mixed/health.yml'
check "/docs -> collection auth always ships"   file_has "$TMP/coll_docs.json" 'apiToken'
check "/internal no tags -> tagged request served" file_has "$TMP/coll_internal_docs.json" 'reindex catalog'
check "/docs serves exactly these seven files" paths_are "$TMP/coll_docs.json" \
  'catalog/folder.yml,catalog/get product.yml,catalog/list products.yml,environments/Local.yml,mixed/folder.yml,mixed/health.yml,opencollection.yml'

echo "== what reaches the browser"
check "/docs title comes from pageTitle"        body_has "$BASE/docs/" '<title>Acme API</title>'
check "/docs data-config has no pageTitle"      config_lacks "$BASE/docs/" 'pageTitle'
check "/docs data-config has no server option"  config_lacks "$BASE/docs/" 'tags|environments|collection'
check "/docs git url is forwarded"              body_has "$BASE/docs/" 'acme/api-collection'
check "/docs git credentials are stripped"      body_lacks "$BASE/docs/" 'token:secret'

echo "== a single bundled file"
check "/bundled/docs/ -> the page"              status_is 200 "$BASE/bundled/docs/"
check "/bundled/docs/collection.yml -> yaml"    header_has Content-Type yaml "$BASE/bundled/docs/collection.yml"
check "/bundled/docs/collection.yml -> ETag"    revalidates "$BASE/bundled/docs/collection.yml"
check "/bundled/docs -> served as written"      body_has "$BASE/bundled/docs/collection.yml" 'Acme API (bundled)'

echo "== a broken setup does not stop the app"
check "the app's own route still answers"       body_has "$BASE/control" 'the app itself'
check "/broken/docs/ -> 404, not a crash"       status_is 404 "$BASE/broken/docs/"
check "/broken/docs/ says what is wrong"        body_has "$BASE/broken/docs/" 'Collection not found'
check "/broken/docs/collection.yml -> 404 too"  status_is 404 "$BASE/broken/docs/collection.yml"

echo "== the host app is left alone"
check "its own 404 still comes from it"         status_is 404 -X POST "$BASE/control"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/openapi.json")" = "200" ]; then
  echo "== the host publishes a spec, and the docs routes are not in it"
  curl -s "$BASE/openapi.json" >"$TMP/spec.json"
  check "no docs route leaked into it"          file_lacks "$TMP/spec.json" '/docs'
  check "the host's own routes are still there" file_has "$TMP/spec.json" '/control'
fi

echo "== the adopter's CSP holds"
check "helmet's CSP header is intact"           header_has Content-Security-Policy "script-src 'self' https://cdn.usebruno.com" "$BASE/docs/"

# ---- bodies, for comparing one framework against another -------------------

if [ -n "$SAVE" ]; then
  mkdir -p "$SAVE"
  cp "$TMP"/coll_*.json "$TMP"/shell_docs.js "$SAVE/"
  echo "saved served bodies to $SAVE"
fi

if [ -n "$COMPARE" ]; then
  echo "== byte-identical to $COMPARE"
  for f in "$TMP"/coll_*.json "$TMP"/shell_docs.js; do
    name="$(basename "$f")"
    check "$name matches" cmp -s "$f" "$COMPARE/$name"
  done
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
