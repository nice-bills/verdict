"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { publicClient } from "@/lib/clients";
import { marketAbi } from "@/lib/contracts";
import { POLL_MARKET_MS } from "@/lib/constants";

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
    const [
      question,
      state,
      outcome,
      reasoning,
      totalYesStake,
      totalNoStake,
      deadline,
      resolveDeposit,
    ] = await Promise.all([
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "question" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "state" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "outcome" }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "agentReasoning",
      }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "totalYesStake",
      }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "totalNoStake",
      }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "deadline" }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "requiredResolveDeposit",
      }),
    ]);

    setSnapshot({
      question: question as string,
      state: Number(state),
      outcome: Number(outcome),
      reasoning: reasoning as string,
      totalYesStake: totalYesStake as bigint,
      totalNoStake: totalNoStake as bigint,
      deadline: deadline as bigint,
      resolveDeposit: resolveDeposit as bigint,
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
    }, POLL_MARKET_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { snapshot, error, refresh, setError };
}
