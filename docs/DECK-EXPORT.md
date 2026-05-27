# Export the Verdict deck to Google Slides (or PowerPoint)

The deck lives at **`docs/verdict-deck.html`**. It is a self-contained web presentation. Google Slides does not import HTML directly — you export **PDF** or **PPTX**, then import that.

## Recommended: PDF → Google Slides

Best visual fidelity (matches the HTML design). Each slide becomes one slide; text is **not** editable (background images).

### Step 1 — Create a PDF

**Option A — Browser (easiest)**

1. Open `docs/verdict-deck.html` in Chrome or Edge.
2. Click **“Save as PDF for Google Slides →”** on the last slide, **or** press `Ctrl+P` / `Cmd+P`.
3. Destination: **Save as PDF**.
4. Layout: **Landscape**.
5. Margins: **None** (if available).
6. Enable **Background graphics** (required for dark theme and glass cards).
7. Save as `verdict-deck.pdf`.

**Option B — Script (headless Chrome)**

```bash
./scripts/export-deck-pdf.sh
# writes docs/verdict-deck.pdf
```

Requires `google-chrome`, `chromium`, or similar on your PATH.

**Option C — Auto-open print dialog**

Open:

```text
docs/verdict-deck.html?print=1
```

Then choose Save as PDF in the print dialog.

### Step 2 — Import into Google Slides

1. Go to [Google Slides](https://slides.google.com) → **Blank presentation** (or open an existing deck).
2. **File → Import slides**.
3. **Upload** → select `verdict-deck.pdf`.
4. Choose **All slides** → **Import slides**.

Slides will look like the HTML deck. To change copy, edit the HTML and re-export PDF, or rebuild text boxes in Slides on top of the imported pages.

---

## PowerPoint (.pptx) → Google Slides

Use this if you want **editable text** in PowerPoint first, then upload to Google.

### Path 1 — Upload an existing PPTX

1. Create or export a `.pptx` (see Path 2 below).
2. Upload the file to [Google Drive](https://drive.google.com).
3. Right-click → **Open with → Google Slides**.
4. Google converts it; review fonts (Instrument Serif may substitute).

### Path 2 — Generate PPTX with Marp (optional)

[Marp](https://marp.app/) exports Markdown to PowerPoint. The repo does not duplicate the full deck in Markdown by default; the **HTML deck is the source of truth**. If you need a native `.pptx` workflow, you can add a `verdict-deck.marp.md` and run:

```bash
npx @marp-team/marp-cli@latest docs/verdict-deck.marp.md --pptx -o docs/verdict-deck.pptx
```

Then upload `verdict-deck.pptx` to Drive → Open with Google Slides.

---

## Other tools

| Tool | How |
|------|-----|
| **Keynote** | File → Import → PDF, or open a converted `.pptx` |
| **PowerPoint desktop** | Insert → Slides from PDF, or open `.pptx` |
| **Canva** | Upload PDF as multi-page import |
| **Present live** | Skip export — open `verdict-deck.html` fullscreen (`F`) and screen-share |

---

## Tips

- **16:9** — Print CSS uses widescreen pages so imports align with default Google Slides aspect ratio.
- **Editable deck in Slides** — Import PDF for looks, then add a blank layout and text boxes for speaker notes; or rebuild slides using the PDF as a style reference.
- **Links** — PDF import flattens links; re-add CTA links in Slides if needed.
- **Updates** — After editing `verdict-deck.html`, re-export PDF and re-import (or replace slides).

## Quick reference

```bash
# PDF for Google Slides
open docs/verdict-deck.html          # then Print → Save as PDF
./scripts/export-deck-pdf.sh         # or automated PDF

# Google Slides: File → Import slides → Upload PDF
```
