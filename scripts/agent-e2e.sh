#!/usr/bin/env bash
# Full Verdict flow via operator CLI (Somnia testnet). Requires setup-operator.sh first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_cli() { node "$ROOT/operator/dist/cli.js" "$@"; }
export VERDICT_JSON=1

set -a
# shellcheck disable=SC1091
source .env
set +a

[[ -n "${FACTORY_ADDRESS:-}" ]] || { echo "Run ./scripts/setup-operator.sh first"; exit 1; }

DEADLINE_MIN="${1:-2}"
QUESTION="${QUESTION:-Does the page contain VERDICT?}"
URL="${DEMO_URL:-https://raw.githubusercontent.com/github/explore/main/README.md}"
RULE="${RULE:-Return YES if the text contains VERDICT (case insensitive), else NO.}"

echo "==> config"
run_cli config

echo "==> create market"
CREATE=$(run_cli create -q "$QUESTION" -u "$URL" -r "$RULE" -m "$DEADLINE_MIN")
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
