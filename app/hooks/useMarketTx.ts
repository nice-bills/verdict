"use client";

import { useCallback, useState } from "react";
import { parseEther, type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { marketAbi } from "@/lib/contracts";
import { publicClient } from "@/lib/clients";
import { MIN_STAKE_STT } from "@/lib/constants";
import type { MarketSnapshot } from "@/lib/market-on-chain";
import { useWallet } from "@/hooks/useWallet";

type UseMarketTxOptions = {
  market: Address;
  snapshot: MarketSnapshot | null;
  onSuccess?: () => Promise<void>;
};

export function useMarketTx({ market, snapshot, onSuccess }: UseMarketTxOptions) {
  const { account, getWalletClient } = useWallet();
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState("0.01");

  const write = useCallback(
    async (fn: "stake" | "resolve" | "claim", args?: { isYes?: boolean }) => {
      if (!account || !snapshot) return;
      setBusy(true);
      setError(null);
      try {
        const wallet = getWalletClient();
        const base = { chain: somniaTestnet, account } as const;
        let hash: Hash;

        if (fn === "stake") {
          const amount = parseEther(stakeAmount || MIN_STAKE_STT);
          if (amount < parseEther(MIN_STAKE_STT)) {
            throw new Error(`Minimum stake is ${MIN_STAKE_STT} STT`);
          }
          hash = await wallet.writeContract({
            ...base,
            address: market,
            abi: marketAbi,
            functionName: "stake",
            args: [args?.isYes ?? true],
            value: amount,
          });
        } else if (fn === "resolve") {
          hash = await wallet.writeContract({
            ...base,
            address: market,
            abi: marketAbi,
            functionName: "resolve",
            value: snapshot.resolveDeposit,
          });
        } else {
          hash = await wallet.writeContract({
            ...base,
            address: market,
            abi: marketAbi,
            functionName: "claim",
          });
        }

        setLastTx(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        await onSuccess?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [account, snapshot, market, stakeAmount, getWalletClient, onSuccess]
  );

  return {
    account,
    busy,
    lastTx,
    error,
    stakeAmount,
    setStakeAmount,
    stake: (isYes: boolean) => write("stake", { isYes }),
    resolve: () => write("resolve"),
    claim: () => write("claim"),
    clearError: () => setError(null),
  };
}
