# Verdict — instructions for coding agents

You operate **Verdict** prediction markets on Somnia testnet. Prefer the **CLI** or **MCP tools** below — do not improvise raw `cast` unless these fail.

## Prerequisites

1. Repo root `.env` (copy from `.env.example`):
   - `PRIVATE_KEY` — wallet with Shannon STT
   - `FACTORY_ADDRESS` — deployed `VerdictFactory`
   - `SOMNIA_RPC_URL` — default `https://api.infra.testnet.somnia.network`
2. Build operator once: `cd operator && npm install && npm run build`

## CLI (structured JSON)

From repo root, after `npm run build` in `operator/`:

```bash
# Check setup
node operator/dist/cli.js config

# Create market
node operator/dist/cli.js create \
  -q "Does the page contain VERDICT?" \
  -u "https://example.com" \
  -r "Return YES if the text contains VERDICT (case insensitive), else NO." \
  -m 2

# Stake / resolve / wait / claim
node operator/dist/cli.js stake --market 0x... --yes --amount 0.01
node operator/dist/cli.js status --market 0x...
node operator/dist/cli.js resolve --market 0x...
node operator/dist/cli.js wait --market 0x... --timeout 180
node operator/dist/cli.js claim --market 0x...
```

Or link globally: `cd operator && npm link` → then `verdict create ...`

**Output:** JSON on non-TTY or with `--json`. Parse `market`, `txHash`, `explorerTx`, `market.state`, `market.outcome`.

## MCP server (Cursor, Claude Desktop, etc.)

Config example — `.cursor/mcp.json` in repo root or user config:

```json
{
  "mcpServers": {
    "verdict": {
      "command": "node",
      "args": ["/absolute/path/to/verdict/operator/dist/mcp-server.js"],
      "env": {
        "PRIVATE_KEY": "0x...",
        "FACTORY_ADDRESS": "0x...",
        "SOMNIA_RPC_URL": "https://api.infra.testnet.somnia.network"
      }
    }
  }
}
```

**Tools:**

| Tool | Purpose |
|------|---------|
| `verdict_get_config` | Env + factory readiness |
| `verdict_create_market` | New market |
| `verdict_stake` | YES/NO stake |
| `verdict_resolve` | Start Somnia agent resolution |
| `verdict_get_outcome` / `verdict_status` | Read state + reasoning |
| `verdict_wait_resolved` | Poll until Resolved |
| `verdict_claim` | Withdraw payout |

## Typical agent workflow

1. `verdict_get_config` — confirm factory + key
2. `verdict_create_market` — save returned `market` address
3. `verdict_stake` — one or more wallets YES/NO
4. Wait until `pastDeadline` in status (or sleep until deadline)
5. `verdict_resolve` — then `verdict_wait_resolved` (30–120s on testnet)
6. `verdict_get_outcome` — show `agentReasoning` + outcome
7. `verdict_claim` for winning/refund side

## Links for demos

- Blockscout: `https://somnia-testnet.blockscout.com`
- Agent receipts: `https://agents.testnet.somnia.network`

## Contracts (reference)

- **Factory** — `createMarket(question, sourceUrl, resolvePrompt, deadline)`
- **Market** — `stake(bool)`, `resolve()`, `claim()`, `handleResponse` (platform only)
- **States:** Open → Resolving → Resolved
- **Outcomes:** YES / NO / INVALID (refund all)

## Do not

- Use the optional Next.js UI unless the user asks
- Call `resolve()` before deadline
- Expect synchronous resolution on testnet — always wait/poll after resolve

## Cursor Cloud specific instructions

### Services overview

| Service | How to run | Notes |
|---------|-----------|-------|
| **Forge tests** | `forge test -vv` | 9 unit tests using MockAgentPlatform; no network needed |
| **Operator CLI** | `node operator/dist/cli.js <command>` | Requires `cd operator && npm install && npm run build` first |
| **Local Anvil E2E** | `bash scripts/local-agent-e2e.sh` | Full create→stake→resolve→claim flow on local Anvil; no testnet STT needed |
| **Next.js UI** | `cd app && pnpm dev` | Optional; needs `pnpm install` first |
| **Testnet E2E** | `bash scripts/agent-e2e.sh` | Requires `PRIVATE_KEY` and `FACTORY_ADDRESS` in `.env` |

### Foundry path

Foundry binaries install to `~/.foundry/bin`. Ensure `PATH` includes this directory (`export PATH="$HOME/.foundry/bin:$PATH"`). The update script handles `foundryup` automatically.

### Local testing without testnet secrets

Run `forge test -vv` and `bash scripts/local-agent-e2e.sh` for full coverage without needing `PRIVATE_KEY` or `FACTORY_ADDRESS`. The local E2E script starts Anvil on port 8545, deploys a MockAgentPlatform + VerdictFactory, and exercises the full market lifecycle via the operator CLI.

### Lint

- Solidity: `forge fmt --check` (repo has minor formatting divergences from forge defaults — this is the existing state)
- Next.js app: `cd app && npx eslint`

### Build

- Contracts: `forge build`
- Operator: `cd operator && npm run build`
- App: `cd app && pnpm build`

### Somnia testnet deployment gotcha

Somnia testnet rejects EIP-1559 (type-2) contract creation transactions. Use `--legacy` flag with `forge create`:

```bash
forge create --rpc-url "$SOMNIA_RPC_URL" --private-key "$PRIVATE_KEY" --legacy --broadcast \
  src/VerdictFactory.sol:VerdictFactory \
  --constructor-args 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776 12875401142070969085
```

The `forge script` deploy path (`script/Deploy.s.sol`) may fail with "Transaction Failure" (gas consumed = gas limit) unless legacy tx mode is forced.

### pnpm build warnings

The `app/` directory uses pnpm. On install you may see "Ignored build scripts" warnings for `sharp` and `unrs-resolver` — these are safe to ignore and do not affect functionality.
