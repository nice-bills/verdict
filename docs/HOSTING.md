# Hosting the Verdict UI

The Next.js app lives in `app/`. Factory address and RPC defaults come from `deployments/shannon.json` (synced to `app/config/shannon.json` at build), so Vercel deploys work without env secrets.

## Vercel (production)

**Use this for the Agentathon demo.** New `/market/0x…` routes work immediately after you create a market — no rebuild.

1. Import [nice-bills/verdict](https://github.com/nice-bills/verdict) on [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `app`.
3. Framework: **Next.js** (auto-detected from `app/vercel.json`).
4. Build command (default): `pnpm run prebuild && pnpm build`
5. Optional env overrides:
   - `NEXT_PUBLIC_FACTORY_ADDRESS`
   - `NEXT_PUBLIC_RPC_URL`

Do **not** set `GITHUB_PAGES` or `NEXT_PUBLIC_BASE_PATH` on Vercel.

### Optional CI deploy

Add GitHub secrets and run **Actions → Deploy app (Vercel)** manually:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | [Account token](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Team/user ID |
| `VERCEL_PROJECT_ID` | Project ID |

Local CLI:

```bash
cd app
npx vercel@41 link
npx vercel@41 deploy --prod
```

## GitHub Pages (optional mirror)

Static export at **https://nice-bills.github.io/verdict/** — requires **Settings → Pages → GitHub Actions**, then **Deploy app** workflow.

- Uses `GITHUB_PAGES=true` and `basePath=/verdict` in CI only.
- New markets need a workflow re-run (or use Vercel).

## Wallet / demo

- MetaMask on **Somnia testnet (chain 50312)** — the app prompts to switch/add the chain.
- Create markets from `/create`; use **Use demo example** for Agentathon copy.
- Legacy smoke markets are hidden on home.

## Explainer

`docs/verdict-explainer.html` — static HTML, host separately if needed.
