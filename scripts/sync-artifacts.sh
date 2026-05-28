#!/usr/bin/env bash
# Sync compiled contract ABIs and deployment config into operator/ and app/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export PATH="${HOME}/.foundry/bin:${PATH}"

OUT_FACTORY="$ROOT/out/VerdictFactory.sol/VerdictFactory.json"
OUT_MARKET="$ROOT/out/VerdictMarket.sol/VerdictMarket.json"
COMMITTED_FACTORY="$ROOT/operator/abis/VerdictFactory.json"
COMMITTED_MARKET="$ROOT/operator/abis/VerdictMarket.json"

if [[ ! -f "$OUT_FACTORY" ]]; then
  if command -v forge >/dev/null 2>&1; then
    echo "==> forge build"
    (cd "$ROOT" && forge build -q)
  elif [[ -f "$COMMITTED_FACTORY" && -f "$COMMITTED_MARKET" ]]; then
    echo "==> using committed ABIs (forge unavailable)"
  else
    echo "error: Verdict ABIs missing and forge is not installed" >&2
    exit 1
  fi
fi

if [[ -f "$OUT_FACTORY" ]]; then
  cp "$OUT_FACTORY" "$ROOT/operator/abis/VerdictFactory.json"
  cp "$OUT_MARKET" "$ROOT/operator/abis/VerdictMarket.json"
fi

cp "$ROOT/operator/abis/VerdictFactory.json" "$ROOT/app/lib/abis/VerdictFactory.json"
cp "$ROOT/operator/abis/VerdictMarket.json" "$ROOT/app/lib/abis/VerdictMarket.json"
cp "$ROOT/deployments/shannon.json" "$ROOT/app/config/shannon.json"

echo "Synced ABIs and app/config/shannon.json"
