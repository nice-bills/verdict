# Hosting the Verdict UI

The Next.js app lives in `app/`. Factory address and RPC defaults come from `deployments/shannon.json`, so you can deploy without setting secrets (override with `NEXT_PUBLIC_*` if needed).

## Option A — Vercel (recommended)

Best for `/market/[address]` routes: new markets work immediately without rebuilding.

1. Import [nice-bills/verdict](https://github.com/nice-bills/verdict) on [vercel.com/new](https://vercel.com/new).
2. Set **Root Directory** to `app`.
3. Framework: **Next.js** (auto-detected).
4. Optional env overrides:
   - `NEXT_PUBLIC_FACTORY_ADDRESS`
   - `NEXT_PUBLIC_RPC_URL`
5. Deploy.

### CI deploy (optional)

Add GitHub repository secrets:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | [Vercel account token](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Team/user ID from Vercel project settings |
| `VERCEL_PROJECT_ID` | Project ID from Vercel project settings |

Push to `main` runs `.github/workflows/deploy-app.yml` → production deploy.

Local CLI:

```bash
cd app
npx vercel@41 link    # once
npx vercel@41 deploy --prod
```

## Option B — GitHub Pages

Free static hosting at:

**https://nice-bills.github.io/verdict/**

Enabled by `.github/workflows/deploy-app.yml` on every push to `main` (app or deployments changes).

- Uses `output: "export"` and `basePath: /verdict`.
- Market pages known at **build time** are pre-rendered from the factory on Somnia.
- **After you create a new market**, re-run the workflow (*Actions → Deploy app → Run workflow*) so `/market/0x…` exists, **or** use Vercel for zero-friction new markets.

### Enable Pages (one-time)

Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Wallet / demo notes

- Users need MetaMask (or similar) on **Somnia testnet (chain 50312)**.
- Connect wallet on the hosted site; create markets from `/create` (or `/verdict/create` on GitHub Pages).
- Legacy smoke markets are hidden on the home list; use **Use demo example** for Agentathon copy.

## Explainer (static HTML)

`docs/verdict-explainer.html` can be hosted separately (GitHub Pages artifact, S3, or `npx serve docs`) — it does not require the Next.js app.
