#!/usr/bin/env bash
# Deploy VerdictFactory to Somnia Shannon testnet (legacy txs required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and set PRIVATE_KEY" >&2
  exit 1
fi
# shellcheck disable=SC1091
source .env

: "${PRIVATE_KEY:?PRIVATE_KEY required in .env}"
RPC="${SOMNIA_RPC_URL:-https://api.infra.testnet.somnia.network}"

echo "==> Deploying VerdictFactory to $RPC (legacy txs)"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --broadcast \
  --legacy \
  -vv

echo "==> Set FACTORY_ADDRESS in .env from log above, then: node operator/dist/cli.js doctor"
