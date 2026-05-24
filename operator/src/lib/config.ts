import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");

function loadEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
  }
}

loadEnv();

export const REPO_ROOT_PATH = REPO_ROOT;

export const RPC_URL =
  process.env.SOMNIA_RPC_URL ??
  process.env.NEXT_PUBLIC_RPC_URL ??
  "https://api.infra.testnet.somnia.network";

export const CHAIN_ID = Number(process.env.SOMNIA_CHAIN_ID ?? 50312);

export const BLOCK_EXPLORER = "https://somnia-testnet.blockscout.com";
export const AGENT_RECEIPTS_URL = "https://agents.testnet.somnia.network";

export function getPrivateKey(): Hex {
  const pk = process.env.PRIVATE_KEY;
  if (!pk || pk === "0x") {
    throw new Error("PRIVATE_KEY missing in .env (repo root)");
  }
  return pk.startsWith("0x") ? (pk as Hex) : (`0x${pk}` as Hex);
}

export function getFactoryAddress(): Address {
  const addr = process.env.FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (!addr) {
    throw new Error("FACTORY_ADDRESS missing in .env — deploy factory first");
  }
  return addr as Address;
}

export function getConfigStatus() {
  const pk = process.env.PRIVATE_KEY;
  const factory = process.env.FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  return {
    repoRoot: REPO_ROOT,
    rpcUrl: RPC_URL,
    chainId: CHAIN_ID,
    factoryAddress: factory ?? null,
    privateKeyConfigured: Boolean(pk && pk !== "0x"),
    blockExplorer: BLOCK_EXPLORER,
    agentReceiptsUrl: AGENT_RECEIPTS_URL,
  };
}
