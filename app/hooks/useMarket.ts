"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { type Address } from "viem";
import { fetchMarketSnapshot, type MarketSnapshot } from "@/lib/market-on-chain";
import { POLL_MARKET_MS } from "@/lib/constants";

export type { MarketSnapshot };

type MarketState = {
  snapshot: MarketSnapshot | null;
  error: string | null;
  loading: boolean;
};

type MarketAction =
  | { type: "reset" }
  | { type: "loaded"; snapshot: MarketSnapshot }
  | { type: "failed"; error: string }
  | { type: "pollOk"; snapshot: MarketSnapshot }
  | { type: "pollFailed"; error: string }
  | { type: "setError"; error: string | null };

const initialMarketState: MarketState = {
  snapshot: null,
  error: null,
  loading: true,
};

function marketReducer(state: MarketState, action: MarketAction): MarketState {
  switch (action.type) {
    case "reset":
      return { snapshot: null, error: null, loading: true };
    case "loaded":
      return { snapshot: action.snapshot, error: null, loading: false };
    case "failed":
      return { ...state, error: action.error, loading: false };
    case "pollOk":
      return { snapshot: action.snapshot, error: null, loading: false };
    case "pollFailed":
      return { ...state, error: action.error, loading: false };
    case "setError":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

export function useMarket(market: Address) {
  const [state, dispatch] = useReducer(marketReducer, initialMarketState);
  const [prevMarket, setPrevMarket] = useState(market);

  if (market !== prevMarket) {
    setPrevMarket(market);
    dispatch({ type: "reset" });
  }

  const fetchSnapshot = useCallback(async () => {
    return fetchMarketSnapshot(market);
  }, [market]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await fetchSnapshot();
        if (!cancelled) dispatch({ type: "loaded", snapshot: data });
      } catch (e) {
        if (!cancelled) {
          dispatch({
            type: "failed",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    };

    void load();

    const id = setInterval(() => {
      fetchSnapshot()
        .then((data) => {
          if (!cancelled) dispatch({ type: "pollOk", snapshot: data });
        })
        .catch((e) => {
          if (!cancelled) {
            dispatch({
              type: "pollFailed",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        });
    }, POLL_MARKET_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [market, fetchSnapshot]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSnapshot();
      dispatch({ type: "pollOk", snapshot: data });
    } catch (e) {
      dispatch({
        type: "pollFailed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [fetchSnapshot]);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "setError", error });
  }, []);

  return { snapshot: state.snapshot, error: state.error, loading: state.loading, refresh, setError };
}
