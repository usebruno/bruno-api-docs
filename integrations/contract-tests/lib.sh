# Shared by check.sh, examples.sh and the matrix: boot a Node app on a port, assert one fact at a
# time from outside it, report the way a test runner does. Needs $TMP for the server log.
#
# Set JUNIT_DIR to also leave a JUnit file per run (JUNIT_NAME names it), which is what CI feeds
# to the Checks tab.

# colour when a person is watching, or asked for it (CI renders ANSI but is not a tty). Never
# into a file or a pipe, so saved and compared output stays plain.
if [ -n "${FORCE_COLOR:-}" ] || { [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; }; then
  GREEN=$'\e[32m' RED=$'\e[31m' BOLD=$'\e[1m' DIM=$'\e[2m' RESET=$'\e[0m'
else
  GREEN="" RED="" BOLD="" DIM="" RESET=""
fi

SECONDS=0
pass=0
fail=0
SUITE=""
failures=()
junit=""
want=""
got=""

# ---- the runner -----------------------------------------------------------------

describe() {
  SUITE=$1
  echo
  echo "  ${BOLD}$1${RESET}"
}

xml_escape() { sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g' <<<"$1"; }

# check NAME HELPER ARGS...: one assertion. A helper leaves what it wanted in $want and what it saw
# in $got, so a failure reads as expected and received, not only as a name.
check() {
  local name=$1
  shift
  want=""
  got=""
  if "$@"; then
    pass=$((pass + 1))
    printf '    %s✓%s %s\n' "$GREEN" "$RESET" "$name"
    junit+="    <testcase classname=\"$(xml_escape "$SUITE")\" name=\"$(xml_escape "$name")\"/>"$'\n'
  else
    fail=$((fail + 1))
    printf '    %s✗ %s%s\n' "$RED" "$name" "$RESET"
    local detail="$*"$'\n'"Expected: ${want:-see the call}"$'\n'"Received: ${got:-nothing recorded}"
    failures+=("${SUITE:+$SUITE › }$name"$'\n'"$detail")
    junit+="    <testcase classname=\"$(xml_escape "$SUITE")\" name=\"$(xml_escape "$name")\">"$'\n'
    junit+="      <failure message=\"$(xml_escape "expected ${want:-see the call}, received ${got:-nothing}")\">$(xml_escape "$detail")</failure>"$'\n'
    junit+="    </testcase>"$'\n'
  fi
}

# the failures again, numbered and in one place, then the totals. RESULTS_FILE, when set, gets the
# two counts for whoever is collecting a table; JUNIT_DIR gets the file for the Checks tab.
summary() {
  if [ "$fail" -gt 0 ]; then
    local n=0
    for f in "${failures[@]}"; do
      n=$((n + 1))
      echo
      echo "  ${RED}$n)${RESET} ${BOLD}${f%%$'\n'*}${RESET}"
      echo "${f#*$'\n'}" | sed 's/^/       /'
    done
  fi

  echo
  if [ "$fail" -eq 0 ]; then
    printf '  %s%s passed%s %s(%ss)%s\n' "$GREEN" "$pass" "$RESET" "$DIM" "$SECONDS" "$RESET"
  else
    printf '  %s%s failed%s, %s passed %s(%ss)%s\n' "$RED" "$fail" "$RESET" "$pass" "$DIM" "$SECONDS" "$RESET"
  fi

  if [ -n "${RESULTS_FILE:-}" ]; then
    printf '%s\t%s\n' "$pass" "$fail" >"$RESULTS_FILE"
  fi

  if [ -n "${JUNIT_DIR:-}" ]; then
    mkdir -p "$JUNIT_DIR"
    {
      echo '<?xml version="1.0" encoding="UTF-8"?>'
      echo "<testsuites>"
      echo "  <testsuite name=\"$(xml_escape "${JUNIT_NAME:-suite}")\" tests=\"$((pass + fail))\" failures=\"$fail\" time=\"$SECONDS\">"
      printf '%s' "$junit"
      echo "  </testsuite>"
      echo "</testsuites>"
    } >"$JUNIT_DIR/${JUNIT_NAME:-suite}.xml"
  fi

  [ "$fail" -eq 0 ]
}

# covered SCRIPT NAME...: every NAME must appear in SCRIPT, or something new was dropped in without
# being wired up. Fails loudly rather than leaving a silent gap in coverage.
covered() {
  local script=$1
  shift
  for name in "$@"; do
    grep -qF "$name" "$script" || { echo "$(basename "$script") does not run $name. Add it." >&2; exit 1; }
  done
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

# ---- helpers: each asserts exactly one fact and records want and got -------------

status_is() { want="$1"; got="$(curl -s -o /dev/null -w '%{http_code}' "${@:2}")"; [ "$got" = "$1" ]; }
header_of() { curl -s -D - -o /dev/null "${@:2}" | tr -d '\r' | awk -v k="$1" 'tolower($1)==tolower(k":"){sub(/^[^:]*: */,"");print}'; }
header_has() { local name=$1 pattern=$2; shift 2; want="$name containing '$pattern'"; got="$name: $(header_of "$name" "$@")"; grep -q "$pattern" <<<"$got"; }
header_absent() { local name=$1; shift; want="no $name header"; got="$name: $(header_of "$name" "$@")"; [ "$got" = "$name: " ]; }
body_has() { local body; body="$(curl -s "$1")"; want="'$2' in the body"; got="not there, in ${#body} bytes"; grep -q "$2" <<<"$body"; }
body_lacks() { want="no '$2' in the body"; got="it is there"; ! grep -Eq "$2" <<<"$(curl -s "$1")"; }
file_has() { want="'$2' in $(basename "$1")"; got="not there"; grep -q "$2" "$1"; }
file_lacks() { want="no '$2' in $(basename "$1")"; got="it is there"; ! grep -q "$2" "$1"; }
revalidates() { status_is 304 -H "If-None-Match: $(header_of ETag "$1")" "$1"; }
redirects_to() { local status location; status="$(curl -s -o /dev/null -w '%{http_code}' "$1")"; location="$(header_of Location "$1")"; want="301, Location: $2"; got="$status, Location: $location"; [ "$status" = 301 ] && [ "$location" = "$2" ]; }
paths_in() { node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.keys(d.files).sort().join(","))' "$1"; }
paths_are() { want="$2"; got="$(paths_in "$1")"; [ "$got" = "$2" ]; }
none_mention() { want="'$1' in no file"; got="found in: $(grep -l "$1" "${@:2}" 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ' ')"; ! grep -q "$1" "${@:2}"; }
no_cdn_origin() { want="no cdn.usebruno.com in $(basename "$1")"; got="$(grep -oE 'https?://[A-Za-z0-9./_-]*usebruno[A-Za-z0-9./_-]*' "$1" | sort -u | tr '\n' ' ')"; ! grep -q 'usebruno.com' "$1"; }
occurs_once() { want="exactly 1 occurrence of '$2'"; got="$(curl -s "$1" | grep -c "$2") occurrences"; [ "${got%% *}" = "1" ]; }
head_like_get() { want="$(header_of Content-Type "$1"; header_of Cache-Control "$1")"; got="$(header_of Content-Type -I "$1"; header_of Cache-Control -I "$1")"; [ "$got" = "$want" ]; }
config_of() { curl -s "$1" | grep -o 'data-config="[^"]*"'; }
config_has() { want="data-config with ($2)"; got="$(config_of "$1")"; grep -Eq "&quot;($2)&quot;:" <<<"$got"; }
config_lacks() { want="data-config without ($2)"; got="$(config_of "$1")"; ! grep -Eq "&quot;($2)&quot;:" <<<"$got"; }
