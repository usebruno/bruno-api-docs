#!/usr/bin/env bash
# Every Node framework against the one contract suite, and every one of them byte for byte against
# the first. Different ports rather than one reused, so a server still shutting down cannot look
# like a port already in use.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$ROOT/contract-tests/lib.sh"

BODIES="$(mktemp -d)"
trap 'rm -rf "$BODIES"' EXIT

run() {
  local name=$1 app=$2 port=$3 adapter=${4:-express}
  echo
  echo "${BOLD}▸ $name${RESET}"
  ADAPTER="$adapter" JUNIT_NAME="check-${name//\//-}" bash "$ROOT/contract-tests/check.sh" --app "$app" --port "$port" "${@:5}"
}

# the first run is the baseline every other one is compared against
run "express"        contract-tests/apps/express.js 5456 express --save "$BODIES"
run "fastify"        contract-tests/apps/fastify.js 5457 express --compare "$BODIES"
run "nestjs/express" contract-tests/apps/nestjs.js  5458 express --compare "$BODIES"
run "nestjs/fastify" contract-tests/apps/nestjs.js  5459 fastify --compare "$BODIES"

echo
echo "${GREEN}every framework agrees, byte for byte: the page, the documents, the bundle${RESET}"
