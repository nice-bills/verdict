"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchMarketSummary,
  listFactoryMarketAddresses,
  type MarketSummary,
} from "@/lib/market-on-chain";
import { filterDisplayMarkets } from "@/lib/market-filters";
import { POLL_MARKETS_MS } from "@/lib/constants";

export type { MarketSummary };

export function useMarketSummaries() {
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const addrs = await listFactoryMarketAddresses();
    if (addrs.length === 0) {
      setMarkets([]);
      return;
    }
    const summaries = await Promise.all(addrs.map(fetchMarketSummary));
    setMarkets(filterDisplayMarkets(summaries.reverse()));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const id = setInterval(() => {
      refresh().catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    }, POLL_MARKETS_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refresh]);

  return { markets, loading, error, refresh };
}
