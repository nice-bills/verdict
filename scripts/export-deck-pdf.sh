#!/usr/bin/env bash
# Export docs/verdict-deck.html to a multi-page PDF (one slide per page).
# Import the PDF in Google Slides: File → Import slides → Upload.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/docs/verdict-deck.pdf}"
HTML="file://${ROOT}/docs/verdict-deck.html"

CHROME=""
for c in google-chrome google-chrome-stable chromium chromium-browser chromium-browser-stable; do
  if command -v "$c" &>/dev/null; then
    CHROME="$c"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "No Chrome/Chromium found."
  echo ""
  echo "Manual export:"
  echo "  1. Open docs/verdict-deck.html in Chrome"
  echo "  2. Print (Ctrl+P) → Save as PDF → Landscape → Background graphics ON"
  echo ""
  echo "See docs/DECK-EXPORT.md for Google Slides import steps."
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw \
  --print-to-pdf="$OUT" \
  "$HTML"

echo "Wrote $OUT"
echo "Google Slides: File → Import slides → Upload this PDF"
