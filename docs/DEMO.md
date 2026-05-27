# Verdict — demo video script (~90 seconds)

Record: terminal (left) + Blockscout or receipt URL (right). No face cam required.

## Setup text overlays (OBS)

| Time | Overlay |
|------|---------|
| 0:00 | "Who decides YES or NO?" |
| 0:20 | "1. Create market" |
| 0:35 | "2. Stake YES / NO" |
| 0:50 | "3. resolve() → Somnia Agent" |
| 1:05 | "4. Consensus verdict → payout" |

## Narration (optional)

1. Prediction markets need a resolver. Today that's humans, multisig, or trusted bots.
2. We create a market on Somnia testnet with a URL and a rule in plain English.
3. Two sides stake YES and NO.
4. After the deadline, anyone calls resolve. Somnia's LLM Parse Website agent reads the page and returns YES, NO, or INVALID — verified by validator consensus.
5. The callback pays winners. The receipt shows every step the agent took.

## Commands to record

```bash
./scripts/demo-local.sh          # optional: show tests pass
./scripts/agent-e2e.sh 2         # live testnet via operator CLI (2 min deadline)
# demo-testnet.sh is an alias for agent-e2e.sh
```

## Links to show on screen

- Market tx on https://somnia-testnet.blockscout.com
- Receipt on https://agents.testnet.somnia.network
