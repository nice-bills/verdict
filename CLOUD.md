# Cursor Cloud Agent — Verdict

Use this repo from **Cursor Cloud** (or any remote agent) without a local UI.

## First-time setup (cloud machine)

```bash
cd verdict   # or your clone path
cp .env.example .env
# Add PRIVATE_KEY (testnet STT) and FACTORY_ADDRESS after deploy

cd operator && npm install && npm run build
forge test -vv
```

## Secrets (never commit)

Set in Cursor **Cloud secrets** or `.env` (gitignored):

| Variable | Purpose |
|----------|---------|
| `PRIVATE_KEY` | Deploy/stake wallet |
| `FACTORY_ADDRESS` | After `forge script script/Deploy.s.sol:Deploy --broadcast` |
| `SOMNIA_RPC_URL` | Default: `https://api.infra.testnet.somnia.network` |

## Agent workflow

Read **[AGENTS.md](AGENTS.md)**. Prefer:

```bash
node operator/dist/cli.js config
node operator/dist/cli.js create -q "..." -u "https://..." -r "..." -m 60
# ... stake, resolve, wait, claim
```

Or enable MCP: copy `.cursor/mcp.json.example` → `.cursor/mcp.json` with absolute paths and secrets.

## Deploy factory (once)

```bash
./scripts/setup-operator.sh
```

## Full testnet demo

```bash
./scripts/agent-e2e.sh 2
```

## Local smoke test (no STT)

```bash
anvil --port 8545 &
./scripts/local-agent-e2e.sh
```
