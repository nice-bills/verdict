"use client";

import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { fetchMarketSnapshot, type MarketSnapshot } from "@/lib/market-on-chain";
import { POLL_MARKET_MS } from "@/lib/constants";

export type { MarketSnapshot };

export function useMarket(market: Address) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchMarketSnapshot(market);
    setSnapshot(data);
  }, [market]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await refresh();
        if (!cancelled) setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    void load();

    const id = setInterval(() => {
      refresh()
        .then(() => {
          if (!cancelled) setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        });
    }, POLL_MARKET_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { snapshot, error, loading, refresh, setError };
}
