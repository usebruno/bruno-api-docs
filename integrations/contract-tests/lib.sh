# Shared by check.sh and examples.sh: boot a Node app on a port, assert one fact at a time from
# outside it, count what passed. Needs $TMP for the server log; sets SERVER_PID.

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

# ---- the server ---------------------------------------------------------------

# a leftover server on the port would answer every assertion, and the suite would be grading the
# wrong process. Say so once, instead of failing fifty times.
port_is_free() {
  if curl -s -o /dev/null --max-time 1 "http://localhost:$1/"; then
    echo "port $1 is already serving something. Stop it, or pass --port." >&2
    exit 2
  fi
}

# boot FILE PORT: from a different cwd on purpose, so a path that only works from the project
# root is caught here. Ready means the port answers anything at all.
boot() {
  ( cd "$TMP" && PORT="$2" node "$1" >"$TMP/server.log" 2>&1 ) &
  SERVER_PID=$!
  for _ in $(seq 1 60); do curl -s -o /dev/null "http://localhost:$2/" && break; sleep 0.1; done
  curl -s -o /dev/null "http://localhost:$2/" || { echo "server did not start"; cat "$TMP/server.log"; exit 1; }
}

# quietly: the shell announces a killed background job, and that reads like a failure
stop() {
  [ -n "${SERVER_PID:-}" ] || return 0
  {
    pkill -P "$SERVER_PID" || true
    kill "$SERVER_PID" || true
    wait "$SERVER_PID" || true
  } 2>/dev/null
  SERVER_PID=""
}

# ---- helpers: each asserts exactly one fact -----------------------------------

status_is() { [ "$(curl -s -o /dev/null -w '%{http_code}' "${@:2}")" = "$1" ]; }
header_of() { curl -s -D - -o /dev/null "${@:2}" | tr -d '\r' | awk -v k="$1" 'tolower($1)==tolower(k":"){sub(/^[^:]*: */,"");print}'; }
header_has() { local name=$1 want=$2; shift 2; header_of "$name" "$@" | grep -q "$want"; }
header_absent() { local name=$1; shift; [ -z "$(header_of "$name" "$@")" ]; }
body_has() { grep -q "$2" <<<"$(curl -s "$1")"; }
body_lacks() { ! grep -Eq "$2" <<<"$(curl -s "$1")"; }
file_has() { grep -q "$2" "$1"; }
file_lacks() { ! grep -q "$2" "$1"; }
revalidates() { status_is 304 -H "If-None-Match: $(header_of ETag "$1")" "$1"; }
redirects_to() { status_is 301 "$1" && [ "$(header_of Location "$1")" = "$2" ]; }
paths_in() { node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.keys(d.files).sort().join(","))' "$1"; }
paths_are() { [ "$(paths_in "$1")" = "$2" ]; }
none_mention() { ! grep -q "$1" "${@:2}"; }
no_origins() { ! grep -oE 'https?://[A-Za-z0-9./_-]+' "$1" | grep -q .; }
occurs_once() { [ "$(curl -s "$1" | grep -c "$2")" = "1" ]; }
config_of() { curl -s "$1" | grep -o 'data-config="[^"]*"'; }
config_lacks() { ! config_of "$1" | grep -Eq "&quot;($2)&quot;:"; }
