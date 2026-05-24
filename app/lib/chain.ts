import { defineChain } from "viem";

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.infra.testnet.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://somnia-testnet.blockscout.com",
    },
  },
});
