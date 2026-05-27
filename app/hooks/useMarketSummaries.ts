"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { publicClient } from "@/lib/clients";
import { FACTORY_ADDRESS, factoryAbi, marketAbi } from "@/lib/contracts";
import { filterDisplayMarkets } from "@/lib/market-filters";
import { POLL_MARKETS_MS } from "@/lib/constants";

export type MarketSummary = {
  address: Address;
  question: string;
  state: number;
  outcome: number;
  totalYesStake: bigint;
  totalNoStake: bigint;
  deadline: bigint;
};

async function loadSummary(address: Address): Promise<MarketSummary> {
  const [question, state, outcome, totalYesStake, totalNoStake, deadline] =
    await Promise.all([
      publicClient.readContract({ address, abi: marketAbi, functionName: "question" }),
      publicClient.readContract({ address, abi: marketAbi, functionName: "state" }),
      publicClient.readContract({ address, abi: marketAbi, functionName: "outcome" }),
      publicClient.readContract({ address, abi: marketAbi, functionName: "totalYesStake" }),
      publicClient.readContract({ address, abi: marketAbi, functionName: "totalNoStake" }),
      publicClient.readContract({ address, abi: marketAbi, functionName: "deadline" }),
    ]);

  return {
    address,
    question: question as string,
    state: Number(state),
    outcome: Number(outcome),
    totalYesStake: totalYesStake as bigint,
    totalNoStake: totalNoStake as bigint,
    deadline: deadline as bigint,
  };
}

export function useMarketSummaries() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const factory = FACTORY_ADDRESS;
    if (!factory) {
      setMarkets([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const count = (await publicClient.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "marketCount",
    })) as bigint;
    const n = Number(count);
    if (n === 0) {
      setMarkets([]);
      setLoading(false);
      setError(null);
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
    const summaries = await Promise.all(addrs.map(loadSummary));
    setMarkets(filterDisplayMarkets(summaries.reverse()));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh()
      .then(() => setError(null))
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, POLL_MARKETS_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { markets, loading, error, refresh };
}
