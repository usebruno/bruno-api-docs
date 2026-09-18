#!/usr/bin/env bash
# The HTTP contract every wrapper, in every framework, in every language must satisfy.
# Boots one rig from contract-tests/apps, asserts from outside it, exits non-zero on any miss.
#
#   bash contract-tests/check.sh --app contract-tests/apps/express.js --port 5456
#   bash contract-tests/check.sh --app ... --save /tmp/express      keep the served bodies
#   bash contract-tests/check.sh --app ... --compare /tmp/express   diff bodies against a run
#
# Every rig serves the same five mounts over the same fixture. That convention is what makes one
# script cover the whole matrix: a cell is an invocation, not an edit.
#
#   /docs          environments include Local, tags exclude internal, pageTitle, gitCollectionUrl
#   /api/v2/docs   environments all minus Prod
#   /internal/docs no options
#   /bundled/docs  a single bundled yml
#   /broken/docs   a collection that is not there
#   /oversize/docs a collection over the caps
#   /misconfigured/docs  an option the core does not know
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/contract-tests/lib.sh"

APP=""
PORT=5456
SAVE=""
COMPARE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --save) SAVE="$2"; shift 2 ;;
    --compare) COMPARE="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$APP" ] || { echo "--app is required" >&2; exit 2; }
case "$APP" in /*) ;; *) APP="$ROOT/$APP" ;; esac
[ -f "$APP" ] || { echo "no app at $APP" >&2; exit 2; }

BASE="http://localhost:$PORT"
JUNIT_NAME="${JUNIT_NAME:-check-$(basename "$APP" .js)${ADAPTER:+-$ADAPTER}}"
TMP="$(mktemp -d)"
trap 'stop; rm -rf "$TMP"' EXIT

# ---- boot, from a different cwd on purpose ---------------------------------

port_is_free "$PORT"
boot "$APP" "$PORT"
echo "${BOLD}$(basename "$APP")${RESET} on :$PORT ${DIM}(cwd $TMP)${RESET}"

# ---- the routes, identical at every mount ----------------------------------

for MOUNT in /docs /api/v2/docs /internal/docs; do
  describe "$MOUNT"
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
  check "$MOUNT/collection.yml -> json, it is a directory"     header_has Content-Type application/json "$url/collection.yml"
  check "$MOUNT/collection.yml -> no-store"                    header_has Cache-Control no-store "$url/collection.yml"
  check "$MOUNT/collection.yml -> nosniff"                     header_has X-Content-Type-Options nosniff "$url/collection.yml"
  check "$MOUNT/collection.yml -> 304 on If-None-Match"        revalidates "$url/collection.yml"
  check "$MOUNT/collection.yml -> no Last-Modified"            header_absent Last-Modified "$url/collection.yml"
  check "$MOUNT/ POST -> 405"                                  status_is 405 -X POST "$url/"
  check "$MOUNT/ POST -> Allow: GET, HEAD"                     header_has Allow 'GET, HEAD' "$url/" -X POST
  check "$MOUNT/ HEAD -> 200"                                  status_is 200 -I "$url/"
  check "$MOUNT/shell.js HEAD -> 200"                          status_is 200 -I "$url/shell.js"
  check "$MOUNT/collection.yml HEAD -> 200"                    status_is 200 -I "$url/collection.yml"
  check "$MOUNT/collection.yml HEAD -> the GET's headers"      head_like_get "$url/collection.yml"

  curl -s "$url/collection.yml" >"$TMP/coll$saved.json"
  curl -s "$url/shell.js" >"$TMP/shell$saved.js"
  curl -s "$url/" >"$TMP/page$saved.html"
done

describe "shell.js is one file, whatever the mount"
check "byte-identical across mounts"            cmp -s "$TMP/shell_docs.js" "$TMP/shell_api_v2_docs.js"
check "byte-identical across mounts (2)"        cmp -s "$TMP/shell_docs.js" "$TMP/shell_internal_docs.js"
check "no origin is baked into the bundle"      no_origins "$TMP/shell_docs.js"
check "it understands the fragments envelope"   file_has "$TMP/shell_docs.js" 'opencollection-fragments'

describe "environments: server side, by whole file"
check "/docs include Local -> exactly Local"    file_has "$TMP/coll_docs.json" 'environments/Local.yml'
check "/docs -> no other environment"           file_lacks "$TMP/coll_docs.json" 'environments/Prod.yml'
check "/api/v2 all minus Prod -> Local only"    file_has "$TMP/coll_api_v2_docs.json" 'environments/Local.yml'
check "/api/v2 -> Prod file absent"             file_lacks "$TMP/coll_api_v2_docs.json" 'environments/Prod.yml'
check "/internal default -> no environments"    file_lacks "$TMP/coll_internal_docs.json" 'environments/'
check "Prod's token appears in no served byte"  none_mention 'prod-token-must-never-be-served' "$TMP"/coll_*.json "$TMP"/shell_docs.js

describe "tags: server side, by whole file, folders pruned behind them"
check "/docs -> the tagged request is gone"     file_lacks "$TMP/coll_docs.json" 'reindex catalog'
check "/docs -> its URL literal is gone too"    file_lacks "$TMP/coll_docs.json" 'admin/reindex-catalog'
check "/docs -> a folder with no survivor goes" file_lacks "$TMP/coll_docs.json" 'internal/folder.yml'
check "/docs -> a folder with one survives"     file_has "$TMP/coll_docs.json" 'mixed/folder.yml'
check "/docs -> and keeps its survivor"         file_has "$TMP/coll_docs.json" 'mixed/health.yml'
check "/docs -> collection auth always ships"   file_has "$TMP/coll_docs.json" 'apiToken'
check "/internal no tags -> tagged request served" file_has "$TMP/coll_internal_docs.json" 'reindex catalog'
check "/docs serves exactly these seven files" paths_are "$TMP/coll_docs.json" \
  'catalog/folder.yml,catalog/get product.yml,catalog/list products.yml,environments/Local.yml,mixed/folder.yml,mixed/health.yml,opencollection.yml'

describe "what reaches the browser"
check "/docs title comes from pageTitle"        body_has "$BASE/docs/" '<title>Acme API</title>'
check "/docs data-config has no pageTitle"      config_lacks "$BASE/docs/" 'pageTitle'
check "/docs data-config has no server option"  config_lacks "$BASE/docs/" 'tags|environments|collection'
check "/docs git url is forwarded"              body_has "$BASE/docs/" 'acme/api-collection'
check "/docs git credentials are stripped"      body_lacks "$BASE/docs/" 'token:secret'
check "/docs data-config carries the logo"      config_has "$BASE/docs/" 'logo'
check "/internal/docs, no logo set, has none"   config_lacks "$BASE/internal/docs/" 'logo'

describe "a single bundled file"
check "/bundled/docs/ -> the page"              status_is 200 "$BASE/bundled/docs/"
check "/bundled/docs/collection.yml -> yaml"    header_has Content-Type yaml "$BASE/bundled/docs/collection.yml"
check "/bundled/docs/collection.yml -> ETag"    revalidates "$BASE/bundled/docs/collection.yml"
check "/bundled/docs -> served as written"      body_has "$BASE/bundled/docs/collection.yml" 'Acme API (bundled)'

describe "a broken setup does not stop the app"
check "the app's own route still answers"       body_has "$BASE/control" 'the app itself'
check "/broken/docs/ -> 404, not a crash"       status_is 404 "$BASE/broken/docs/"
check "/broken/docs/ says what is wrong"        body_has "$BASE/broken/docs/" 'Collection not found'
check "/broken/docs/collection.yml -> 404 too"  status_is 404 "$BASE/broken/docs/collection.yml"

describe "a collection over the caps is refused at the mount"
check "/oversize/docs/collection.yml -> 413"    status_is 413 "$BASE/oversize/docs/collection.yml"
check "/oversize/docs/ -> 413 as well"          status_is 413 "$BASE/oversize/docs/"
check "and it names the cap"                    body_has "$BASE/oversize/docs/" 'per-file size cap'

describe "an option we do not know is an error, not a silent no-op"
check "/misconfigured/docs/ -> 500"             status_is 500 "$BASE/misconfigured/docs/"
check "naming the key"                          body_has "$BASE/misconfigured/docs/" 'unknown option theme'

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/portal")" = "200" ]; then
  describe "embed(): the docs block inside the host's own page"
  check "the host's own page is what is served"  body_has "$BASE/portal" 'Acme Developer Portal'
  check "the block is in it"                     body_has "$BASE/portal" 'id="bruno-docs"'
  check "pointing at the mount it belongs to"    body_has "$BASE/portal" 'src="/portal/docs/shell.js"'
  check "one html document, not two"             occurs_once "$BASE/portal" '<html'
  check "and the host page keeps its own title"  occurs_once "$BASE/portal" '<title'
fi

describe "the host app is left alone"
check "its own 404 still comes from it"         status_is 404 -X POST "$BASE/control"

if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/openapi.json")" = "200" ]; then
  describe "the host publishes a spec, and the docs routes are not in it"
  curl -s "$BASE/openapi.json" >"$TMP/spec.json"
  check "no docs route leaked into it"          file_lacks "$TMP/spec.json" '/docs'
  check "the host's own routes are still there" file_has "$TMP/spec.json" '/control'
fi

describe "the adopter's CSP holds"
check "the CSP allows the renderer's origin"    header_has Content-Security-Policy "script-src 'self' https://cdn.usebruno.com" "$BASE/docs/"
check "and the data: uri its wasm comes from"  header_has Content-Security-Policy "connect-src 'self' data:" "$BASE/docs/"
check "and instantiating that wasm"            header_has Content-Security-Policy "wasm-unsafe-eval" "$BASE/docs/"

# ---- bodies, for comparing one framework against another -------------------

if [ -n "$SAVE" ]; then
  mkdir -p "$SAVE"
  cp "$TMP"/coll_*.json "$TMP"/page_*.html "$TMP"/shell_docs.js "$SAVE/"
  echo "saved served bodies to $SAVE"
fi

if [ -n "$COMPARE" ]; then
  describe "byte-identical to $COMPARE"
  for f in "$TMP"/coll_*.json "$TMP"/page_*.html "$TMP"/shell_docs.js; do
    name="$(basename "$f")"
    check "$name matches" cmp -s "$f" "$COMPARE/$name"
  done
fi

summary
