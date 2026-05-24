"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { publicClient } from "@/lib/clients";
import { marketAbi } from "@/lib/contracts";

export type MarketSnapshot = {
  question: string;
  state: number;
  outcome: number;
  reasoning: string;
  totalYesStake: bigint;
  totalNoStake: bigint;
  deadline: bigint;
  resolveDeposit: bigint;
};

export function useMarket(market: Address) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const results = await publicClient.multicall({
      contracts: [
        { address: market, abi: marketAbi, functionName: "question" },
        { address: market, abi: marketAbi, functionName: "state" },
        { address: market, abi: marketAbi, functionName: "outcome" },
        { address: market, abi: marketAbi, functionName: "agentReasoning" },
        { address: market, abi: marketAbi, functionName: "totalYesStake" },
        { address: market, abi: marketAbi, functionName: "totalNoStake" },
        { address: market, abi: marketAbi, functionName: "deadline" },
        { address: market, abi: marketAbi, functionName: "requiredResolveDeposit" },
      ],
    });

    const failed = results.find((r) => r.status === "failure");
    if (failed?.status === "failure") {
      throw failed.error;
    }

    setSnapshot({
      question: results[0].result as string,
      state: Number(results[1].result),
      outcome: Number(results[2].result),
      reasoning: results[3].result as string,
      totalYesStake: results[4].result as bigint,
      totalNoStake: results[5].result as bigint,
      deadline: results[6].result as bigint,
      resolveDeposit: results[7].result as bigint,
    });
  }, [market]);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { snapshot, error, refresh, setError };
}
