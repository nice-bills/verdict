#!/usr/bin/env bash
# Push verdict to GitHub. Usage: ./scripts/push-github.sh [git@github.com:USER/verdict.git]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE_URL="${1:-}"

if [[ -z "$REMOTE_URL" ]]; then
  echo "Usage: $0 <remote-url>"
  echo "Example: $0 https://github.com/YOUR_USER/verdict.git"
  echo "Example: $0 git@github.com:YOUR_USER/verdict.git"
  exit 1
fi

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

echo "==> Pushing main (5 commits)..."
git push -u origin main

echo ""
echo "Done. Clone for Cursor Cloud:"
echo "  $REMOTE_URL"
