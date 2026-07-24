#!/usr/bin/env sh
# Dev bootstrap. `npm install` runs the `prepare` hook, which installs the
# husky pre-commit hook — that's all a teammate needs.
set -e
npm install
echo "Done. Pre-commit lint is active."
