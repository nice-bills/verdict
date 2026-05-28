#!/usr/bin/env bash
# Sync compiled contract ABIs and deployment config into operator/ and app/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export PATH="${HOME}/.foundry/bin:${PATH}"

if [[ ! -f "$ROOT/out/VerdictFactory.sol/VerdictFactory.json" ]]; then
  echo "==> forge build"
  (cd "$ROOT" && forge build -q)
fi

cp "$ROOT/out/VerdictFactory.sol/VerdictFactory.json" "$ROOT/operator/abis/VerdictFactory.json"
cp "$ROOT/out/VerdictMarket.sol/VerdictMarket.json" "$ROOT/operator/abis/VerdictMarket.json"
cp "$ROOT/operator/abis/VerdictFactory.json" "$ROOT/app/lib/abis/VerdictFactory.json"
cp "$ROOT/operator/abis/VerdictMarket.json" "$ROOT/app/lib/abis/VerdictMarket.json"
cp "$ROOT/deployments/shannon.json" "$ROOT/app/config/shannon.json"

echo "Synced ABIs and app/config/shannon.json"
