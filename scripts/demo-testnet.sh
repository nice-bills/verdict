#!/usr/bin/env bash
# Somnia testnet demo — requires .env with PRIVATE_KEY and FACTORY_ADDRESS
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and set PRIVATE_KEY + FACTORY_ADDRESS"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

RPC="${SOMNIA_RPC_URL:-https://api.infra.testnet.somnia.network}"
FACTORY="${FACTORY_ADDRESS:?Set FACTORY_ADDRESS}"

DEADLINE=$(($(date +%s) + 60))
QUESTION="Does the demo page contain VERDICT?"
URL="${DEMO_URL:-https://raw.githubusercontent.com/github/explore/main/README.md}"
RULE="Return YES if the text contains VERDICT (case insensitive), else NO."

echo "==> Creating market via factory $FACTORY"
MARKET=$(cast send "$FACTORY" \
  "createMarket(string,string,string,uint256)(address)" \
  "$QUESTION" "$URL" "$RULE" "$DEADLINE" \
  --rpc-url "$RPC" --private-key "$PRIVATE_KEY" | awk '/return/ {print $2; exit}')
echo "Market: $MARKET"

echo "==> Staking YES (0.01 STT)"
cast send "$MARKET" "stake(bool)" true --value 0.01ether \
  --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

echo "==> Waiting for deadline ($DEADLINE)..."
while [[ $(date +%s) -lt $DEADLINE ]]; do sleep 5; done

DEPOSIT=$(cast call "$MARKET" "requiredResolveDeposit()(uint256)" --rpc-url "$RPC")
echo "==> Resolving (deposit $DEPOSIT wei)"
cast send "$MARKET" "resolve()" --value "$DEPOSIT" \
  --rpc-url "$RPC" --private-key "$PRIVATE_KEY"

echo "==> Poll outcome (agent is async on real Somnia — may take 30-120s)"
for i in $(seq 1 40); do
  STATE=$(cast call "$MARKET" "state()(uint8)" --rpc-url "$RPC")
  if [[ "$STATE" == "2" ]]; then
    OUT=$(cast call "$MARKET" "outcome()(uint8)" --rpc-url "$RPC")
    REASON=$(cast call "$MARKET" "agentReasoning()(string)" --rpc-url "$RPC")
    echo "Resolved! outcome=$OUT reasoning=$REASON"
    echo "Claim: cast send $MARKET claim() --rpc-url $RPC --private-key \$PRIVATE_KEY"
    exit 0
  fi
  sleep 5
done
echo "Timed out waiting for resolution — check agents.testnet.somnia.network receipts"
