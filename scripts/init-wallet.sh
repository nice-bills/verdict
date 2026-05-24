#!/usr/bin/env bash
# Generate a fresh deploy wallet and write .env (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT=$(cast wallet new 2>&1)
ADDR=$(echo "$OUT" | awk '/Address:/ {print $2}')
PK=$(echo "$OUT" | awk '/Private key:/ {print $2}')

cat > .env <<EOF
SOMNIA_RPC_URL=https://api.infra.testnet.somnia.network
PRIVATE_KEY=$PK
FACTORY_ADDRESS=

NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_RPC_URL=https://api.infra.testnet.somnia.network
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_PLATFORM_ADDRESS=0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776
EOF

echo "Wrote .env"
echo "Address (fund via https://testnet.somnia.network/ or https://shannon-faucet.netlify.app/):"
echo "$ADDR"
cast balance "$ADDR" --rpc-url https://api.infra.testnet.somnia.network || true
