#!/usr/bin/env bash
# Local demo using Foundry — no UI, no testnet required.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Running Verdict contract tests (local mock platform)"
forge test -vv

echo ""
echo "==> Demo complete. For testnet: deploy factory, then ./scripts/demo-testnet.sh"
