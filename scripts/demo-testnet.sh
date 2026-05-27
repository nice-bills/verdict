#!/usr/bin/env bash
# Somnia testnet demo via operator CLI (preferred over raw cast).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and set PRIVATE_KEY + FACTORY_ADDRESS"
  exit 1
fi

if [[ ! -f operator/dist/cli.js ]]; then
  echo "Build operator first: cd operator && npm install && npm run build"
  exit 1
fi

exec "$ROOT/scripts/agent-e2e.sh" "${1:-2}"
