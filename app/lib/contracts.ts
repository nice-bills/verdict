import factoryArtifact from "./abis/VerdictFactory.json";
import marketArtifact from "./abis/VerdictMarket.json";
import { resolveFactoryAddress } from "./deployment";

export const factoryAbi = factoryArtifact.abi;
export const marketAbi = marketArtifact.abi;

/** Env override, else `deployments/shannon.json` (works on Vercel / GitHub Pages without secrets). */
export const FACTORY_ADDRESS = resolveFactoryAddress();

export const STATE_LABELS = ["Open", "Resolving", "Resolved"] as const;
export const OUTCOME_LABELS = ["—", "YES", "NO", "INVALID"] as const;
