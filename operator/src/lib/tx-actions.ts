import { type Address, type Hash } from "viem";
import { BLOCK_EXPLORER } from "./config.js";
import { getWalletClient, waitReceipt } from "./client.js";
import { readMarketView } from "./market-read.js";
import type { ActionResult, MarketView, TxLinks } from "./types.js";
import { runAction } from "./errors.js";

export function txLinks(hash: Hash): TxLinks {
  return {
    txHash: hash,
    explorerTx: `${BLOCK_EXPLORER}/tx/${hash}`,
  };
}

export async function finishWriteAction<T extends Record<string, unknown>>(
  market: Address,
  hash: Hash,
  extra: T
): Promise<ActionResult<T & TxLinks & { market?: MarketView }>> {
  await waitReceipt(hash);
  let marketView: MarketView | undefined;
  try {
    marketView = await readMarketView(market);
  } catch {
    /* tx succeeded */
  }
  return {
    ok: true,
    ...txLinks(hash),
    ...extra,
    ...(marketView ? { market: marketView } : {}),
  };
}

export async function runMarketWrite<T extends Record<string, unknown>>(
  write: () => Promise<Hash>,
  market: Address,
  extra: T
): Promise<ActionResult<T & TxLinks & { market?: MarketView }>> {
  return runAction(async () => {
    const hash = await write();
    return finishWriteAction(market, hash, extra);
  });
}

export function resolveNote() {
  return "Somnia agents are async on testnet — poll with `verdict status` or `verdict wait` (30–120s typical)";
}
