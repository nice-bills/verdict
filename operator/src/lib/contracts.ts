import factoryArtifact from "../../abis/VerdictFactory.json" with { type: "json" };
import marketArtifact from "../../abis/VerdictMarket.json" with { type: "json" };

export const factoryAbi = factoryArtifact.abi;
export const marketAbi = marketArtifact.abi;

export const STATE_LABELS = ["Open", "Resolving", "Resolved"] as const;
export const OUTCOME_LABELS = ["None", "YES", "NO", "INVALID"] as const;

export const MIN_STAKE_WEI = 1_000_000_000_000_000n; // 0.001 ether
