#!/usr/bin/env bash
# The framework matrix: every major we claim in peerDependencies, each installed from our tarballs
# into its own clean tree next to a copy of its example, with the contract suite run against it.
# This is the evidence for the peer ranges we publish.
#
#   bash nodejs/scripts/matrix.sh                      every cell, under the node that is running
#   bash nodejs/scripts/matrix.sh --family fastify     that family's majors (CI runs one job per family)
#   bash nodejs/scripts/matrix.sh --cell nestjs@10     one cell, to reproduce a failure
#   bash nodejs/scripts/matrix.sh --docker             every cell under node 22 and 24, in containers
#
# A cell is family@major. The nestjs cells run both adapters, since the adapter is what broke.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAMILY=""
CELL=""
DOCKER=""
PASSTHROUGH=()
while [ $# -gt 0 ]; do
  case "$1" in
    --family) FAMILY="$2"; PASSTHROUGH+=("$1" "$2"); shift 2 ;;
    --cell) CELL="$2"; PASSTHROUGH+=("$1" "$2"); shift 2 ;;
    --docker) DOCKER=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# --docker is a wrapper, not a second implementation: each container runs this same script natively
if [ -n "$DOCKER" ]; then
  docker info >/dev/null 2>&1 || { echo "docker is installed but the daemon is not running" >&2; exit 2; }
  for node in 22 24; do
    echo
    echo "############ node $node, in a container"
    docker build --quiet --build-arg "NODE=$node" -f "$ROOT/nodejs/scripts/matrix.Dockerfile" \
      -t "api-docs-matrix:node$node" "$ROOT" >/dev/null
    docker run --rm "api-docs-matrix:node$node" ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}
  done
  exit 0
fi

ALL_CELLS="express@4 express@5 fastify@4 fastify@5 nestjs@10 nestjs@11 nestjs@12"
if [ -n "$CELL" ]; then
  case " $ALL_CELLS " in *" $CELL "*) ;; *) echo "unknown cell '$CELL'. one of: $ALL_CELLS" >&2; exit 2 ;; esac
  CELLS="$CELL"
elif [ -n "$FAMILY" ]; then
  # no case inside $(...): bash 3.2 reads the pattern's ')' as the end of the substitution
  CELLS=""
  for c in $ALL_CELLS; do
    if [[ "$c" == "$FAMILY"@* ]]; then
      CELLS="$CELLS $c"
    fi
  done
  [ -n "$CELLS" ] || { echo "no cells for family '$FAMILY'" >&2; exit 2; }
else
  CELLS="$ALL_CELLS"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ---- pack once, every cell installs the same tarballs ---------------------------------

TARBALLS="$TMP/tarballs"
mkdir -p "$TARBALLS"
for pkg in core express fastify nestjs; do
  ( cd "$ROOT/nodejs/$pkg" && npm pack --silent --pack-destination "$TARBALLS" >/dev/null )
done
# listed once into a variable: `tar | grep -q` under pipefail fails when grep quits before tar
# finishes writing, which GNU tar's archive order made happen on every run
core_files="$(tar -tzf "$TARBALLS"/*api-docs-core*.tgz)"
grep -q 'package/shell/shell.js' <<<"$core_files" || { echo "shell.js is NOT in the core tarball" >&2; exit 1; }
grep -q 'package/shell/shell.html' <<<"$core_files" || { echo "shell.html is NOT in the core tarball" >&2; exit 1; }
echo "packed $(ls "$TARBALLS" | wc -l | tr -d ' ') tarballs, the core ships its shell"

# ---- what each cell installs, on top of our tarballs -----------------------------------

deps_for() {
  case "$1" in
    express@4) echo "express@^4 helmet" ;;
    express@5) echo "express@^5 helmet" ;;
    fastify@4) echo "fastify@^4 @fastify/swagger@^8" ;;
    fastify@5) echo "fastify@^5 @fastify/swagger@^9" ;;
    nestjs@10) echo "@nestjs/common@^10 @nestjs/core@^10 @nestjs/platform-express@^10 @nestjs/platform-fastify@^10 reflect-metadata rxjs helmet" ;;
    nestjs@11) echo "@nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11 @nestjs/platform-fastify@^11 reflect-metadata rxjs helmet" ;;
    nestjs@12) echo "@nestjs/common@^12 @nestjs/core@^12 @nestjs/platform-express@^12 @nestjs/platform-fastify@^12 reflect-metadata rxjs helmet" ;;
    *) echo "unknown cell: $1" >&2; exit 2 ;;
  esac
}

# ---- one cell -------------------------------------------------------------------------

run_cell() {
  local cell=$1 port=$2
  local family="${cell%@*}"
  local app="$TMP/$cell"

  mkdir -p "$app/apps"
  printf '{ "name": "matrix-%s", "private": true, "version": "0.0.0" }\n' "${cell/@/-}" >"$app/package.json"
  cp "$ROOT/contract-tests/apps/$family.js" "$app/apps/$family.js"
  cp -R "$ROOT/contract-tests/fixtures" "$app/fixtures"

  # shellcheck disable=SC2046
  ( cd "$app" && npm install --silent --no-audit --no-fund \
      "$TARBALLS"/*api-docs-core*.tgz "$TARBALLS"/*api-docs-"$family"*.tgz $(deps_for "$cell") >/dev/null )

  local installed
  case "$family" in
    express) installed="express $(node -p "require('$app/node_modules/express/package.json').version")" ;;
    fastify) installed="fastify $(node -p "require('$app/node_modules/fastify/package.json').version")" ;;
    nestjs)  installed="@nestjs/core $(node -p "require('$app/node_modules/@nestjs/core/package.json').version")" ;;
  esac
  echo "   installed $installed"

  # suite PORT [VAR=value ...]
  suite() {
    local port=$1
    shift
    env "$@" bash "$ROOT/contract-tests/check.sh" --app "$app/apps/$family.js" --port "$port" | tail -1
  }
  if [ "$family" = "nestjs" ]; then
    echo "   platform-express"
    suite "$port"
    echo "   platform-fastify"
    suite "$((port + 1))" ADAPTER=fastify
  else
    suite "$port"
  fi
}

# ---- the run ----------------------------------------------------------------------------

total=$(echo $CELLS | wc -w | tr -d ' ')
n=0
failed=""
for cell in $CELLS; do
  n=$((n + 1))
  echo
  echo "### [$n/$total] node $(node -v)  $cell"
  if run_cell "$cell" $((5470 + n * 2)); then
    :
  else
    failed="$failed $cell"
  fi
done

echo
if [ -n "$failed" ]; then
  echo "FAILED:$failed"
  exit 1
fi
echo "all $total cells green on node $(node -v)"
