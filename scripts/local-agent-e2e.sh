#!/usr/bin/env bash
# Local Anvil demo: mock platform + verdict CLI (no testnet STT required).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ANVIL_PK="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC="http://127.0.0.1:8545"
run_cli() { node "$ROOT/operator/dist/cli.js" "$@"; }
export VERDICT_JSON=1

(cd operator && npm run build -s)

if ! curl -sf -X POST "$RPC" -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null 2>&1; then
  echo "==> Starting anvil"
  anvil --port 8545 >/tmp/verdict-anvil.log 2>&1 &
  ANVIL_PID=$!
  for _ in $(seq 1 30); do
    curl -sf -X POST "$RPC" -H 'content-type: application/json' \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' >/dev/null && break
    sleep 0.5
  done
  trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
fi

export PRIVATE_KEY="$ANVIL_PK"
export SOMNIA_RPC_URL="$RPC"
export SOMNIA_CHAIN_ID=31337

echo "==> Deploy mock platform + factory"
DEPLOY_OUT=$(forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$ANVIL_PK" -vv 2>&1)
echo "$DEPLOY_OUT" | tail -20

PLATFORM=$(echo "$DEPLOY_OUT" | awk '/MOCK_PLATFORM/ {print $2; exit}')
FACTORY=$(echo "$DEPLOY_OUT" | awk '/VerdictFactory/ {print $2; exit}')
export FACTORY_ADDRESS="$FACTORY"
export MOCK_PLATFORM="$PLATFORM"

echo "PLATFORM=$PLATFORM FACTORY=$FACTORY"

echo "==> create"
CREATE=$(run_cli create -q "Local VERDICT test" -u "https://example.com" -r "Return YES" -m 0 -d "$(($(date +%s) + 30))")
MARKET=$(echo "$CREATE" | jq -r '.market')
echo "MARKET=$MARKET"

echo "==> stake YES"
run_cli stake --market "$MARKET" --yes --amount 0.01

echo "==> time warp + resolve"
cast rpc evm_increaseTime 60 --rpc-url "$RPC" >/dev/null
cast rpc evm_mine --rpc-url "$RPC" >/dev/null

RESOLVE=$(run_cli resolve --market "$MARKET")
REQ=$(echo "$RESOLVE" | jq -r '.market.stateRaw // empty')
echo "$RESOLVE"

echo "==> mock deliverResponse(1)"
cast send "$PLATFORM" "deliverResponse(uint256)" 1 --rpc-url "$RPC" --private-key "$ANVIL_PK" >/dev/null

echo "==> wait"
run_cli wait --market "$MARKET" --timeout 30

echo "==> claim"
run_cli claim --market "$MARKET"

echo "==> final status"
run_cli status --market "$MARKET"

echo "Local agent E2E OK"
