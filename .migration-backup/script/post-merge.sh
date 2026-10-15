#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")/.."

if [[ ! -f package-lock.json ]]; then
  printf 'Post-merge setup requires the committed package-lock.json.\n' >&2
  exit 1
fi

printf 'Installing the locked dependencies, including build tools...\n'
npm ci --include=dev --no-audit --no-fund

printf 'Checking TypeScript and core regression tests...\n'
npm run check
npm test

printf 'Building the production app and versioned PWA shell...\n'
npm run build

# The platform reconciles workflows after this script succeeds.
# Do not start another server or mutate databases/browser-local portfolios here.
