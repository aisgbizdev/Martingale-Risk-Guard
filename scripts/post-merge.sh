#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm test
pnpm run test:visual:unit
# Artifact workflows rebuild their own services with PORT and BASE_PATH.
# MRG portfolios are browser-local; no database push belongs in setup.
