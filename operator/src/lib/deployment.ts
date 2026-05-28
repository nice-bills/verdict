import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isAddress } from "viem";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export type ShannonDeployment = {
  chainId: number;
  platform: string;
  parseWebsiteAgentId: string;
  factory: string;
  rpcUrl: string;
  explorer: string;
  agentsExplorer: string;
  legacyMarketAddresses?: string[];
};

let cached: ShannonDeployment | null = null;

export function loadShannonDeployment(): ShannonDeployment {
  if (cached) return cached;
  const path = resolve(REPO_ROOT, "deployments/shannon.json");
  if (!existsSync(path)) {
    throw new Error(`Missing deployments/shannon.json at ${path}`);
  }
  cached = JSON.parse(readFileSync(path, "utf8")) as ShannonDeployment;
  return cached;
}

export function factoryFromDeployment(): string | undefined {
  const f = loadShannonDeployment().factory?.trim();
  if (f && isAddress(f, { strict: false })) return f;
  return undefined;
}
