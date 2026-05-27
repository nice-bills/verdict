"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { publicClient } from "@/lib/clients";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";

export function useMarkets() {
  const [markets, setMarkets] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const factory = FACTORY_ADDRESS;
    if (!factory) {
      setMarkets([]);
      return;
    }
    const count = (await publicClient.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "marketCount",
    })) as bigint;
    const n = Number(count);
    if (n === 0) {
      setMarkets([]);
      return;
    }
    const addrs: Address[] = [];
    for (let i = 0; i < n; i++) {
      const addr = (await publicClient.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [BigInt(i)],
      })) as Address;
      addrs.push(addr);
    }
    setMarkets(addrs.reverse());
  }, []);

  useEffect(() => {
    refresh()
      .then(() => setError(null))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refresh]);

  return { markets, error, refresh };
}
