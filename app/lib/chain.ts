import { defineChain } from "viem";
import { resolveChainId, resolveRpcUrl, SHANNON } from "./deployment";

export const somniaTestnet = defineChain({
  id: resolveChainId(),
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [resolveRpcUrl()],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: SHANNON.explorer,
    },
  },
});

export const AGENTS_EXPLORER_URL = SHANNON.agentsExplorer;
