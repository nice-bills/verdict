import type { Address } from "viem";
import { getFactoryAddress, getPublicClient, factoryAbi } from "./client.js";

export async function listFactoryMarketAddresses(): Promise<Address[]> {
  const client = getPublicClient();
  const factory = getFactoryAddress();
  const count = (await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "marketCount",
  })) as bigint;
  const n = Number(count);
  if (n === 0) return [];

  const indices = Array.from({ length: n }, (_, i) => BigInt(i));
  const addresses = await Promise.all(
    indices.map((i) =>
      client.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [i],
      })
    )
  );
  return addresses as Address[];
}
