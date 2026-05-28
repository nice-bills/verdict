import { getAddress, type Hash, type TransactionReceipt } from "viem";
import { keccak256, toBytes } from "viem";

const MARKET_CREATED_TOPIC = keccak256(
  toBytes("MarketCreated(uint256,address,address)")
);

function marketAddressFromReceipt(receipt: TransactionReceipt): `0x${string}` | null {
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== MARKET_CREATED_TOPIC.toLowerCase()) continue;
    const marketTopic = log.topics[2];
    if (!marketTopic) continue;
    return getAddress(marketTopic);
  }
  return null;
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
