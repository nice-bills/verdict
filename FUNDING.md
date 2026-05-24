# Fund your deploy wallet

A wallet was generated in `.env` (gitignored). To fund it:

```bash
grep PRIVATE_KEY .env | head -1   # never commit this file
cast wallet address --private-key "$(grep ^PRIVATE_KEY= .env | cut -d= -f2)"
```

Or run `./scripts/init-wallet.sh` to create a new one.

**Faucets**

- https://testnet.somnia.network/
- https://shannon-faucet.netlify.app/

After you have STT:

```bash
./scripts/setup-operator.sh    # deploy factory + verify config
./scripts/agent-e2e.sh 2       # full testnet flow (2 min deadline)
```
