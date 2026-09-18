#!/usr/bin/env bash
# The unit suites, reported like the other layers: one line each, a JUnit file when CI asks.
# Each suite is a plain node script that exits non-zero on its first failed assertion.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
source "$ROOT/contract-tests/lib.sh"
JUNIT_NAME="${JUNIT_NAME:-unit}"

# runs CMD...: passes when the command exits clean; otherwise the tail of its output is what we saw
runs() {
  local out
  out="$("$@" 2>&1)" && return 0
  want="a clean exit"
  got="$(tail -4 <<<"$out")"

  return 1
}

describe "core"
check "walk: the safety rules and the caps"      runs node "$ROOT/nodejs/core/test/walk.test.mjs"
check "filter: environments and tags by file"    runs node "$ROOT/nodejs/core/test/filter.test.mjs"
check "collection: sources and providers"        runs node "$ROOT/nodejs/core/test/collection.test.mjs"
check "shell: the page, the bundle, embed()"     runs node "$ROOT/nodejs/core/test/shell.test.mjs"
check "docs: createDocs end to end"              runs node "$ROOT/nodejs/core/test/docs.test.mjs"

describe "wrappers"
check "nestjs: the sub-path on platform-fastify" runs node "$ROOT/nodejs/nestjs/test/sub-path.test.mjs"

describe "shell"
check "assemble: fragments into one document"    runs node "$ROOT/shell/test/assemble.test.mjs"

summary
