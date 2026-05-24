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
import { CHAIN_ID, getFactoryAddress, getPrivateKey, RPC_URL } from "./config.js";
import { factoryAbi, marketAbi } from "./contracts.js";

const MARKET_CREATED_TOPIC = keccak256(
  toBytes("MarketCreated(uint256,address,address)")
);

export const somniaChain = {
  id: CHAIN_ID,
  name: CHAIN_ID === 31337 ? "Anvil Local" : "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

export function getPublicClient() {
  return createPublicClient({
    chain: somniaChain,
    transport: http(RPC_URL),
  });
}

export function getWalletClient() {
  const account = privateKeyToAccount(getPrivateKey());
  return createWalletClient({
    account,
    chain: somniaChain,
    transport: http(RPC_URL),
  });
}

export function getAccountAddress(): Address {
  return privateKeyToAccount(getPrivateKey()).address;
}

function addressFromTopic(topic: Hex): Address {
  return getAddress(`0x${topic.slice(-40)}`);
}

export function marketFromReceipt(receipt: TransactionReceipt): Address | null {
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== MARKET_CREATED_TOPIC.toLowerCase()) continue;
    const topic = log.topics[2];
    if (!topic) continue;
    return addressFromTopic(topic);
  }
  return null;
}

export async function waitReceipt(hash: Hash) {
  const client = getPublicClient();
  return client.waitForTransactionReceipt({ hash });
}

export { getFactoryAddress, factoryAbi, marketAbi };
