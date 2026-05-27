import { createPublicClient, http } from "viem";
import { factoryAbi } from "./contracts";
import { SHANNON, resolveRpcUrl } from "./deployment";
import { somniaTestnet } from "./chain";

/** Pre-render market pages at build time (GitHub Pages static export). */
export async function listMarketAddressesForStaticExport(): Promise<{ address: string }[]> {
  try {
    const client = createPublicClient({
      chain: somniaTestnet,
      transport: http(resolveRpcUrl()),
    });
    const count = (await client.readContract({
      address: SHANNON.factory,
      abi: factoryAbi,
      functionName: "marketCount",
    })) as bigint;
    const params: { address: string }[] = [];
    for (let i = 0n; i < count; i++) {
      const addr = (await client.readContract({
        address: SHANNON.factory,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [i],
      })) as `0x${string}`;
      params.push({ address: addr.toLowerCase() });
    }
    return params;
  } catch {
    return [];
  }
}
