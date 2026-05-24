import { parseEventLogs, type Hash, type TransactionReceipt } from "viem";
import { factoryAbi } from "./contracts";

export function marketAddressFromReceipt(receipt: TransactionReceipt): `0x${string}` | null {
  const events = parseEventLogs({
    abi: factoryAbi,
    logs: receipt.logs,
    eventName: "MarketCreated",
  });
  return events[0]?.args.market ?? null;
}

export async function waitForMarketFromTx(txHash: Hash) {
  const { publicClient } = await import("./clients");
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const market = marketAddressFromReceipt(receipt);
  if (!market) {
    throw new Error("MarketCreated event not found in transaction receipt");
  }
  return market;
}
