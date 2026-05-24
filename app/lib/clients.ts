import { createPublicClient, http } from "viem";
import { somniaTestnet } from "./chain";

export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(),
});
