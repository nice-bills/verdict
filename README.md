# Verdict

Consensus-resolved prediction markets on [Somnia](https://somnia.network) Agentic L1.

Lock YES/NO stakes, then call `resolve()` to invoke Somnia’s **LLM Parse Website** agent. Validators reach consensus on the outcome; the contract pays winners (or refunds on `INVALID`).

Built for the [Somnia Agentathon](https://www.encodeclub.com/programmes/agentathon) (Encode Club).

## Repo layout

```
verdict/
├── src/              # Solidity (VerdictFactory, VerdictMarket)
├── test/             # Forge tests (mock Somnia platform)
├── script/           # Deploy.s.sol
├── scripts/          # demo-local.sh, demo-testnet.sh
├── docs/DEMO.md      # 90s video script
├── deployments/      # shannon.json addresses
└── app/              # Optional minimal Next.js UI
```

## Quick start (no UI)

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
  --broadcast

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

## Demo video

See [docs/DEMO.md](docs/DEMO.md). You do **not** need a polished UI — CLI + Blockscout + agent receipt URL is enough.

## UI (optional)

```bash
cd app && cp ../.env.example .env.local
# Set NEXT_PUBLIC_FACTORY_ADDRESS after deploy
pnpm install && pnpm dev
```

## License

MIT
