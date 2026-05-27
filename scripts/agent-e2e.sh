#!/usr/bin/env bash
# Full Verdict flow via operator CLI (Somnia testnet). Requires setup-operator.sh first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/demo-defaults.sh"

run_cli() { node "$ROOT/operator/dist/cli.js" "$@"; }
export VERDICT_JSON=1

set -a
# shellcheck disable=SC1091
source .env
set +a

[[ -n "${FACTORY_ADDRESS:-}" ]] || { echo "Run ./scripts/setup-operator.sh first"; exit 1; }

DEADLINE_MIN="${1:-2}"

echo "==> config"
run_cli config

echo "==> create market"
CREATE=$(run_cli create -q "$DEMO_QUESTION" -u "$DEMO_URL" -r "$DEMO_RULE" -m "$DEADLINE_MIN")
echo "$CREATE"
MARKET=$(echo "$CREATE" | jq -r '.market')
[[ "$MARKET" != null && -n "$MARKET" ]] || { echo "create failed"; exit 1; }

echo "==> stake YES"
run_cli stake --market "$MARKET" --yes --amount 0.01

echo "==> wait for deadline (${DEADLINE_MIN}m)..."
sleep $((DEADLINE_MIN * 60 + 5))

echo "==> resolve"
run_cli resolve --market "$MARKET"

echo "==> wait for Somnia agent (up to 180s)"
run_cli wait --market "$MARKET" --timeout 180

echo "==> status"
STATUS=$(run_cli status --market "$MARKET")
echo "$STATUS"

echo "==> claim"
run_cli claim --market "$MARKET" || true

echo ""
echo "Done. Market: $MARKET"
echo "Explorer: https://somnia-testnet.blockscout.com/address/$MARKET"
echo "Agent receipts: https://agents.testnet.somnia.network"
