#!/usr/bin/env bash
# Every example under examples/integrations/nodejs boots and does what its own file says it does.
# One at a time on one port, the way a reader runs them. The Nest ones run from their compiled
# dist, which is the point of writing them in TypeScript.
#
#   bash contract-tests/examples.sh [--port 5480]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES="$(cd "$ROOT/../examples/integrations/nodejs" && pwd)"
source "$ROOT/contract-tests/lib.sh"

# the examples sit outside the workspace, so this is how they find the packages and the frameworks
export NODE_PATH="$ROOT/node_modules"

PORT=5480
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

( cd "$ROOT" && npm run build:examples --silent )
covered "$0" \
  $(cd "$EXAMPLES" && ls */*.js) \
  $(cd "$EXAMPLES" && ls -d nestjs/0*/ | sed 's|nestjs/\(.*\)/$|nestjs/dist/\1/main.js|')

BASE="http://localhost:$PORT"
JUNIT_NAME="${JUNIT_NAME:-examples}"
TMP="$(mktemp -d)"
trap 'stop; rm -rf "$TMP"' EXIT
port_is_free "$PORT"

# example FILE: stops the one before, boots this one
example() {
  stop
  describe "$1"
  boot "$EXAMPLES/$1" "$PORT"
}

CSP="Content-Security-Policy"
BEARER=(-H 'Authorization: Bearer let-me-in')
API_KEY=(-H 'x-api-key: let-me-in')

# ---- express -------------------------------------------------------------------

example express/quickstart.js
check "/docs -> 301 docs/"                       redirects_to "$BASE/docs" "docs/"
check "/docs/ -> the page"                       header_has Content-Type text/html "$BASE/docs/"
check "/docs/shell.js -> 200"                    status_is 200 "$BASE/docs/shell.js"
check "the collection is the one beside it"      body_has "$BASE/docs/collection.yml" 'Acme API'
check "/health is the app's own"                 status_is 200 "$BASE/health"

example express/auth.js
check "/health stays open"                       status_is 200 "$BASE/health"
check "/docs/ -> 401"                            status_is 401 "$BASE/docs/"
check "/docs/ says how to authenticate"          header_has WWW-Authenticate Bearer "$BASE/docs/"
check "/docs/collection.yml -> 401"              status_is 401 "$BASE/docs/collection.yml"
check "/docs/shell.js -> 401"                    status_is 401 "$BASE/docs/shell.js"
check "/docs -> 401, the guard is before the redirect" status_is 401 "$BASE/docs"
check "/docs/ with the token -> 200"             status_is 200 "${BEARER[@]}" "$BASE/docs/"
check "/docs/collection.yml with the token -> 200" status_is 200 "${BEARER[@]}" "$BASE/docs/collection.yml"

example express/csp.js
check "/docs/ -> 200"                            status_is 200 "$BASE/docs/"
check "script-src allows the CDN, Monaco and wasm" header_has "$CSP" "script-src 'self' https://cdn.usebruno.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'" "$BASE/docs/"
check "connect-src allows data:"                 header_has "$CSP" "connect-src 'self' data:" "$BASE/docs/"
check "style-src allows the fonts"               header_has "$CSP" "fonts.googleapis.com" "$BASE/docs/"

example express/embed.js
check "/ is the host's own page"                 body_has "$BASE/" 'Acme Developer Portal'
check "with the docs block in it"                body_has "$BASE/" 'id="bruno-docs"'
check "loading from the mount"                   body_has "$BASE/" 'src="/docs/shell.js"'
check "one document, not two"                    occurs_once "$BASE/" '<html'
check "the mount serves the collection"          body_has "$BASE/docs/collection.yml" 'Acme API'

# ---- fastify -------------------------------------------------------------------

example fastify/quickstart.js
check "/docs -> 301 docs/"                       redirects_to "$BASE/docs" "docs/"
check "/docs/ -> the page"                       header_has Content-Type text/html "$BASE/docs/"
check "/docs/shell.js -> 200"                    status_is 200 "$BASE/docs/shell.js"
check "the collection is the one beside it"      body_has "$BASE/docs/collection.yml" 'Acme API'
check "/health is the app's own"                 status_is 200 "$BASE/health"

example fastify/auth.js
check "/health stays open"                       status_is 200 "$BASE/health"
check "/docs/ -> 401"                            status_is 401 "$BASE/docs/"
check "/docs/ says how to authenticate"          header_has WWW-Authenticate Bearer "$BASE/docs/"
check "/docs/collection.yml -> 401"              status_is 401 "$BASE/docs/collection.yml"
check "/docs/shell.js -> 401"                    status_is 401 "$BASE/docs/shell.js"
check "/docs -> 401, the guard is before the redirect" status_is 401 "$BASE/docs"
check "POST /docs/ -> 401, the guard is before the 405" status_is 401 -X POST "$BASE/docs/"
check "/docs/ with the token -> 200"             status_is 200 "${BEARER[@]}" "$BASE/docs/"
check "/docs/collection.yml with the token -> 200" status_is 200 "${BEARER[@]}" "$BASE/docs/collection.yml"

example fastify/csp.js
check "/docs/ -> 200"                            status_is 200 "$BASE/docs/"
check "script-src allows the CDN, Monaco and wasm" header_has "$CSP" "script-src 'self' https://cdn.usebruno.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'" "$BASE/docs/"
check "connect-src allows data:"                 header_has "$CSP" "connect-src 'self' data:" "$BASE/docs/"
check "style-src allows the fonts"               header_has "$CSP" "fonts.googleapis.com" "$BASE/docs/"

example fastify/embed.js
check "/ is the host's own page"                 body_has "$BASE/" 'Acme Developer Portal'
check "with the docs block in it"                body_has "$BASE/" 'id="bruno-docs"'
check "loading from the mount"                   body_has "$BASE/" 'src="/docs/shell.js"'
check "one document, not two"                    occurs_once "$BASE/" '<html'
check "the mount serves the collection"          body_has "$BASE/docs/collection.yml" 'Acme API'

# ---- nestjs, from the compiled dist -------------------------------------------------

example nestjs/dist/01-quickstart/main.js
check "/docs -> 301 docs/"                       redirects_to "$BASE/docs" "docs/"
check "/docs/ -> the page"                       header_has Content-Type text/html "$BASE/docs/"
check "/docs/shell.js -> 200"                    status_is 200 "$BASE/docs/shell.js"
check "the collection resolved from dist/"       body_has "$BASE/docs/collection.yml" 'Acme API'

example nestjs/dist/02-auth/main.js
check "/docs/ stays open"                        status_is 200 "$BASE/docs/"
check "/internal/docs/ -> 401"                   status_is 401 "$BASE/internal/docs/"
check "/internal/docs/collection.yml -> 401"     status_is 401 "$BASE/internal/docs/collection.yml"
check "/internal/docs/shell.js -> 401"           status_is 401 "$BASE/internal/docs/shell.js"
check "/internal/docs -> 401, the guard is before the redirect" status_is 401 "$BASE/internal/docs"
check "/internal/docs/ with the key -> 200"      status_is 200 "${API_KEY[@]}" "$BASE/internal/docs/"
check "/internal/docs/collection.yml with the key -> 200" status_is 200 "${API_KEY[@]}" "$BASE/internal/docs/collection.yml"

example nestjs/dist/03-global-prefix/main.js
check "/docs/ -> 404, it moved"                  status_is 404 "$BASE/docs/"
check "/api/docs -> 301 docs/"                   redirects_to "$BASE/api/docs" "docs/"
check "/api/docs/ -> the page"                   header_has Content-Type text/html "$BASE/api/docs/"
check "/api/docs/shell.js -> 200"                status_is 200 "$BASE/api/docs/shell.js"
check "/api/docs/collection.yml -> the collection" body_has "$BASE/api/docs/collection.yml" 'Acme API'

example nestjs/dist/04-fastify-adapter/main.js
check "/docs -> 301 docs/"                       redirects_to "$BASE/docs" "docs/"
check "/docs/ -> the page"                       header_has Content-Type text/html "$BASE/docs/"
check "/docs/shell.js -> 200, not the page"      header_has Content-Type javascript "$BASE/docs/shell.js"
check "/docs/collection.yml -> the collection"   body_has "$BASE/docs/collection.yml" 'Acme API'
check "/docs/<deep>/ -> the page"                header_has Content-Type text/html "$BASE/docs/catalog/list-products/"

example nestjs/dist/05-csp/main.js
check "/docs/ -> 200"                            status_is 200 "$BASE/docs/"
check "script-src allows the CDN, Monaco and wasm" header_has "$CSP" "script-src 'self' https://cdn.usebruno.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'" "$BASE/docs/"
check "connect-src allows data:"                 header_has "$CSP" "connect-src 'self' data:" "$BASE/docs/"
check "style-src allows the fonts"               header_has "$CSP" "fonts.googleapis.com" "$BASE/docs/"

example nestjs/dist/06-embed/main.js
check "/ is the host's own page"                 body_has "$BASE/" 'Acme Developer Portal'
check "with the docs block in it"                body_has "$BASE/" 'id="bruno-docs"'
check "loading from the mount"                   body_has "$BASE/" 'src="/docs/shell.js"'
check "one document, not two"                    occurs_once "$BASE/" '<html'
check "the mount serves the collection"          body_has "$BASE/docs/collection.yml" 'Acme API'

summary
