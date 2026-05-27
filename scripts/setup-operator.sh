#!/usr/bin/env bash
# Build operator, ensure .env exists, deploy factory to Somnia testnet if needed.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Building operator"
(cd operator && npm install && npm run build)

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — set PRIVATE_KEY and re-run."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${PRIVATE_KEY:-}" || "$PRIVATE_KEY" == "0x" ]]; then
  echo "ERROR: Set PRIVATE_KEY in .env (wallet with Shannon STT)."
  echo "Faucet: https://testnet.somnia.network/ or https://shannon-faucet.netlify.app/"
  exit 1
fi

RPC="${SOMNIA_RPC_URL:-https://api.infra.testnet.somnia.network}"

if [[ -z "${FACTORY_ADDRESS:-}" ]]; then
  echo "==> Deploying VerdictFactory to Somnia testnet"
  forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$RPC" \
    --broadcast \
    --legacy \
    -vv

  FACTORY=$(forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" 2>/dev/null | awk '/VerdictFactory/ {print $2; exit}')
  if [[ -z "$FACTORY" ]]; then
  echo "Deploy broadcast done — paste factory address from output into .env FACTORY_ADDRESS="
  exit 0
  fi

  if grep -q '^FACTORY_ADDRESS=' .env; then
    sed -i "s|^FACTORY_ADDRESS=.*|FACTORY_ADDRESS=$FACTORY|" .env
  else
    echo "FACTORY_ADDRESS=$FACTORY" >> .env
  fi
  echo "FACTORY_ADDRESS=$FACTORY written to .env"
else
  echo "Factory already set: $FACTORY_ADDRESS"
fi

VERDICT_JSON=1 node operator/dist/cli.js config
