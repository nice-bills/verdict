import factoryArtifact from "./abis/VerdictFactory.json";
import marketArtifact from "./abis/VerdictMarket.json";

export const factoryAbi = factoryArtifact.abi;
export const marketAbi = marketArtifact.abi;

export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined;

export const STATE_LABELS = ["Open", "Resolving", "Resolved"] as const;
export const OUTCOME_LABELS = ["—", "YES", "NO", "INVALID"] as const;
