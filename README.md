# Verdict

Consensus-resolved prediction markets on [Somnia](https://somnia.network) Agentic L1.

Lock YES/NO stakes, then call `resolve()` to invoke Somnia’s **LLM Parse Website** agent. Validators reach consensus on the outcome; the contract pays winners (or refunds on `INVALID`).

Built for the [Somnia Agentathon](https://www.encodeclub.com/programmes/agentathon) (Encode Club).

## Repo layout

```
verdict/
├── src/              # Solidity (VerdictFactory, VerdictMarket)
├── operator/         # CLI + MCP for coding agents (primary UX)
├── AGENTS.md         # Instructions for Cursor / Claude Code / Codex
├── test/             # Forge tests (mock Somnia platform)
├── script/           # Deploy.s.sol
├── scripts/          # demo-local.sh, demo-testnet.sh (fallback)
├── docs/             # DEMO.md, verdict-explainer.html
├── deployments/      # shannon.json addresses
└── app/              # Optional Next.js UI
```

## Agent operator (recommended)

Tell **Cursor CLI**, **Claude Code**, **Codex**, or any MCP client what you want in plain English. They call structured tools — no hand-running shell scripts.

```bash
cd operator && npm install && npm run build

# CLI (JSON output for agents)
node dist/cli.js config
node dist/cli.js create -q "..." -u "https://..." -r "..." -m 60
node dist/cli.js stake --market 0x... --yes
node dist/cli.js resolve --market 0x...
node dist/cli.js wait --market 0x...
node dist/cli.js claim --market 0x...
```

**MCP:** copy [mcp.json.example](mcp.json.example) → `.cursor/mcp.json` (set absolute path + env). Tools: `verdict_create_market`, `verdict_stake`, `verdict_resolve`, `verdict_get_outcome`, `verdict_claim`, …

Full guide: **[AGENTS.md](AGENTS.md)**

## Quick start (contracts)

```bash
forge test -vv
./scripts/demo-local.sh
```

## Deploy (Somnia testnet, chain 50312)

```bash
cp .env.example .env
# Set PRIVATE_KEY with testnet STT

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://api.infra.testnet.somnia.network \
  --broadcast \
  --legacy

# Put factory address in .env FACTORY_ADDRESS=0x...
./scripts/demo-testnet.sh
```

## Contracts

| Contract | Role |
|----------|------|
| `VerdictFactory` | Creates markets |
| `VerdictMarket` | Stakes, `resolve()` → Somnia agent, `claim()` |

**Platform (testnet):** `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`  
**LLM Parse Website agent ID:** `12875401142070969085`

## How it works (visual)

Open **[docs/verdict-explainer.html](docs/verdict-explainer.html)** in a browser — interactive diagrams, flow, payout calculator, and demo checklist. Share by hosting the file or sending the HTML directly.

## Demo video

See [docs/DEMO.md](docs/DEMO.md). Record your coding agent using `verdict` / MCP tools, then Blockscout + [agent receipts](https://agents.testnet.somnia.network). No web UI required.

## UI

```bash
cd app && pnpm install && pnpm dev
```

Factory/RPC default from `deployments/shannon.json` (no `.env` required for read-only).

**Hosted:** see **[docs/HOSTING.md](docs/HOSTING.md)** — GitHub Pages (`/verdict`) or Vercel (recommended for new markets without rebuild).

## License

MIT
