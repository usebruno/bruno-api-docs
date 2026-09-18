#!/usr/bin/env bash
# First-time setup for integrations/, safe to rerun: the pinned toolchain and a clean build.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v mise >/dev/null 2>&1; then
  echo "mise is not installed. It reads mise.toml and gives you the pinned Node."
  if command -v brew >/dev/null 2>&1 && [ -t 0 ]; then
    read -r -p "Install it with Homebrew now? [y/N] " answer
    if [ "$answer" = "y" ]; then
      brew install mise
    fi
  fi
  command -v mise >/dev/null 2>&1 || { echo "Install it first: https://mise.jdx.dev/getting-started.html"; exit 1; }
fi

mise trust --quiet 2>/dev/null || mise trust
mise install

pinned="$(mise exec -- node -v)"
current="$(node -v 2>/dev/null || echo none)"
if [ "$pinned" != "$current" ]; then
  echo
  echo "mise.toml pins node $pinned; your shell runs $current."
  echo "Activate mise for your shell and cd into this directory switches automatically:"
  echo "  https://mise.jdx.dev/getting-started.html#activate-mise"
  echo "Until then, prefix commands with: mise exec --"
  echo
fi

# stale build output from another node or an older checkout is the usual source of a mystery failure
rm -rf nodejs/*/dist nodejs/*/shell shell/shell.js
mise exec -- npm ci
mise exec -- npm run build

echo
echo "Ready. The whole gate: npm test"
