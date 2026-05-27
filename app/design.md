# Design — Verdict

Locked system. **Hallmark** studied-DNA + user liquid-glass spec (full-screen video hero).

## Stack
Next.js 15 · TypeScript · Tailwind v4 · lucide-react · viem

## Global shell (every page)
- `HeroVideoBackground` — CloudFront MP4, `translate-y-[17%]`, rAF 500ms loop fade
- `liquid-glass` class — exact gradient border via `::before`
- Instrument Serif (`@import` + next/font)
- Black cinematic base

## Legacy markets
On-chain smoke tests matching `isLegacySmokeMarket()` are **hidden** on home. Direct URL still works with warning banner.

## Pages
- `/` — hero + how it works + live markets
- `/create` — glass form, demo example
- `/market/[address]` — trade panel + reasoning
