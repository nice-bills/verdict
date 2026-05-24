---
name: verdict-operator
description: Operate Verdict prediction markets on Somnia via CLI or MCP. Use when the user wants to create, stake, resolve, check status, or claim on Verdict markets, or when using verdict CLI/MCP tools.
---

# Verdict operator

Read [AGENTS.md](../../../AGENTS.md) at the repo root for full instructions.

## Quick path

1. `cd operator && npm install && npm run build`
2. Ensure repo `.env` has `PRIVATE_KEY` and `FACTORY_ADDRESS`
3. Use MCP tools (`verdict_*`) or CLI:

```bash
verdict config
verdict create -q "..." -u "https://..." -r "..." -m 60
verdict stake --market 0x... --yes
verdict resolve --market 0x...
verdict wait --market 0x...
verdict claim --market 0x...
```

## Rules

- After `resolve`, wait 30–120s (testnet) before expecting Resolved
- Always return JSON fields: `market`, `explorerTx`, `market.outcome`, `agentReasoning`
- On failure, read `error` in JSON and check `verdict_get_config`
