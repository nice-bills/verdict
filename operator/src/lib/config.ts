import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Address, Hex } from "viem";
import { factoryFromDeployment, loadShannonDeployment } from "./deployment.js";
import { parseFactoryAddress } from "./validate.js";

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

function readRpcUrl(): string {
  const raw =
    process.env.SOMNIA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    "";
  if (raw) {
    try {
      new URL(raw);
      return raw;
    } catch {
      throw new Error(`Invalid SOMNIA_RPC_URL: ${raw}`);
    }
  }
  return "https://api.infra.testnet.somnia.network";
}

export const RPC_URL = readRpcUrl();

function readChainId(): number {
  const raw = process.env.SOMNIA_CHAIN_ID?.trim();
  if (!raw) return 50312;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid SOMNIA_CHAIN_ID: ${raw}`);
  }
  return n;
}

export const CHAIN_ID = readChainId();

function shannon() {
  try {
    return loadShannonDeployment();
  } catch {
    return null;
  }
}

export const BLOCK_EXPLORER =
  shannon()?.explorer ?? "https://somnia-testnet.blockscout.com";
export const AGENT_RECEIPTS_URL =
  shannon()?.agentsExplorer ?? "https://agents.testnet.somnia.network";

export function getPrivateKey(): Hex {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk || pk === "0x") {
    throw new Error("PRIVATE_KEY missing in .env (repo root)");
  }
  const hex = pk.startsWith("0x") ? pk : `0x${pk}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("PRIVATE_KEY must be 32 bytes (64 hex chars)");
  }
  return hex as Hex;
}

function readFactoryFromEnv(): string | undefined {
  const raw = process.env.FACTORY_ADDRESS ?? process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  if (!raw || raw === "0x" || raw.toLowerCase() === "null") {
    return undefined;
  }
  return raw;
}

export function getFactoryAddress(): Address {
  const addr = readFactoryFromEnv() ?? factoryFromDeployment();
  if (!addr) {
    throw new Error(
      "FACTORY_ADDRESS missing — set in .env or deploy factory (see deployments/shannon.json)"
    );
  }
  return parseFactoryAddress(addr);
}

export function getConfigStatus() {
  const pk = process.env.PRIVATE_KEY;
  const factory = readFactoryFromEnv();
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
