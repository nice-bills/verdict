import shannon from "@/config/shannon.json";

export type ShannonDeployment = {
  chainId: number;
  platform: `0x${string}`;
  parseWebsiteAgentId: string;
  factory: `0x${string}`;
  rpcUrl: string;
  explorer: string;
  agentsExplorer: string;
};

export const SHANNON: ShannonDeployment = shannon as ShannonDeployment;

export function resolveFactoryAddress(): `0x${string}` | undefined {
  const env = process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.trim();
  if (env && env !== "null" && env !== "") {
    return env as `0x${string}`;
  }
  return SHANNON.factory;
}

export function resolveRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    SHANNON.rpcUrl ||
    "https://api.infra.testnet.somnia.network"
  );
}

export function resolveChainId(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  if (raw) {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return SHANNON.chainId;
}
