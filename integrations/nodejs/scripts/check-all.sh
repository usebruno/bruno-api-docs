#!/usr/bin/env bash
# Every Node framework against the one contract suite, and every one of them byte for byte against
# the first. Different ports rather than one reused, so a server still shutting down cannot look
# like a port already in use.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BODIES="$(mktemp -d)"
trap 'rm -rf "$BODIES"' EXIT

run() {
  local name=$1 example=$2 port=$3 adapter=${4:-express}
  echo
  echo "### $name"
  ADAPTER="$adapter" bash "$ROOT/contract-tests/check.sh" --example "$example" --port "$port" "${@:5}"
}

# the first run is the baseline every other one is compared against
run "express"        nodejs/express/example/server.js 5456 express --save "$BODIES"
run "fastify"        nodejs/fastify/example/server.js 5457 express --compare "$BODIES"
run "nestjs/express" nodejs/nestjs/example/server.js  5458 express --compare "$BODIES"
run "nestjs/fastify" nodejs/nestjs/example/server.js  5459 fastify --compare "$BODIES"

echo
echo "every framework agrees, byte for byte"
