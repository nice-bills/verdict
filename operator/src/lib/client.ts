import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getFactoryAddress, getPrivateKey, RPC_URL } from "./config.js";
import { factoryAbi, marketAbi } from "./contracts.js";

const MARKET_CREATED_TOPIC = keccak256(
  toBytes("MarketCreated(uint256,address,address)")
);

export const somniaTestnet = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

export function getPublicClient() {
  return createPublicClient({
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });
}

export function getWalletClient() {
  const account = privateKeyToAccount(getPrivateKey());
  return createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });
}

export function getAccountAddress(): Address {
  return privateKeyToAccount(getPrivateKey()).address;
}

export function marketFromReceipt(receipt: TransactionReceipt): Address | null {
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== MARKET_CREATED_TOPIC.toLowerCase()) continue;
    const topic = log.topics[2];
    if (!topic) continue;
    return getAddress(topic);
  }
  return null;
}

export async function waitReceipt(hash: Hash) {
  const client = getPublicClient();
  return client.waitForTransactionReceipt({ hash });
}

export { getFactoryAddress, factoryAbi, marketAbi };
