"use client";

import { useReducer } from "react";
import Link from "next/link";
import { type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { waitForMarketFromTx } from "@/lib/factory";
import { DEMO_MARKET } from "@/lib/examples";
import { blockscoutTxUrl } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { VerdictShell } from "@/components/verdict-shell";
import { LiquidNav } from "@/components/liquid-nav";
import { WalletBanner } from "@/components/wallet-banner";

type CreateState = {
  question: string;
  sourceUrl: string;
  resolvePrompt: string;
  deadlineMinutes: string;
  txHash: Hash | null;
  marketAddress: Address | null;
  error: string | null;
  busy: boolean;
};

type CreateAction =
  | { type: "field"; field: keyof Pick<CreateState, "question" | "sourceUrl" | "resolvePrompt" | "deadlineMinutes">; value: string }
  | { type: "fillDemo" }
  | { type: "submitStart" }
  | { type: "submitSuccess"; txHash: Hash; marketAddress: Address }
  | { type: "submitError"; error: string }
  | { type: "clearError" };

const initialState: CreateState = {
  question: "",
  sourceUrl: "",
  resolvePrompt: "",
  deadlineMinutes: "30",
  txHash: null,
  marketAddress: null,
  error: null,
  busy: false,
};

function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case "field":
      return { ...state, [action.field]: action.value };
    case "fillDemo":
      return {
        ...state,
        question: DEMO_MARKET.question,
        sourceUrl: DEMO_MARKET.sourceUrl,
        resolvePrompt: DEMO_MARKET.resolvePrompt,
        deadlineMinutes: DEMO_MARKET.deadlineMinutes,
      };
    case "submitStart":
      return { ...state, busy: true, error: null, txHash: null, marketAddress: null };
    case "submitSuccess":
      return {
        ...state,
        txHash: action.txHash,
        marketAddress: action.marketAddress,
        busy: false,
      };
    case "submitError":
      return { ...state, error: action.error, busy: false };
    case "clearError":
      return { ...state, error: null };
    default:
      return state;
  }
}

export function CreatePageClient() {
  const { account, connect, getWalletClient } = useWallet();
  const [state, dispatch] = useReducer(createReducer, initialState);

  async function handleConnect() {
    dispatch({ type: "clearError" });
    try {
      await connect();
    } catch (e) {
      dispatch({
        type: "submitError",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function createMarket() {
    if (!FACTORY_ADDRESS || !account) return;
    if (!state.question.trim() || !state.sourceUrl.trim() || !state.resolvePrompt.trim()) {
      dispatch({ type: "submitError", error: "Fill in question, source URL, and resolution rule." });
      return;
    }
    dispatch({ type: "submitStart" });
    try {
      const wallet = getWalletClient();
      const deadline =
        BigInt(Math.floor(Date.now() / 1000)) +
        BigInt(Math.max(1, Number(state.deadlineMinutes)) * 60);
      const hash = await wallet.writeContract({
        chain: somniaTestnet,
        account,
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createMarket",
        args: [
          state.question.trim(),
          state.sourceUrl.trim(),
          state.resolvePrompt.trim(),
          deadline,
        ],
      });
      const market = await waitForMarketFromTx(hash);
      dispatch({ type: "submitSuccess", txHash: hash, marketAddress: market });
    } catch (e) {
      dispatch({
        type: "submitError",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <VerdictShell>
      <LiquidNav account={account} onConnect={handleConnect} />

      <main className="app-section mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Markets
        </Link>

        <h1
          className="font-instrument mt-8 text-4xl text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Open a market
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Plain-English question, public URL, and how the agent should decide YES / NO / INVALID.
        </p>

        <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

        {!FACTORY_ADDRESS && (
          <p className="mt-6 rounded-2xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            Factory address missing: cannot create markets. Check deployments/shannon.json or set
            NEXT_PUBLIC_FACTORY_ADDRESS.
          </p>
        )}

        <div className="liquid-glass mt-8 space-y-6 rounded-2xl p-6 md:p-8">
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Question
            <input
              className="liquid-glass-input mt-2 w-full rounded-xl px-4 py-3"
              placeholder="Will X happen before date Y?"
              value={state.question}
              onChange={(e) =>
                dispatch({ type: "field", field: "question", value: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Source URL
            <input
              className="liquid-glass-input mt-2 w-full rounded-xl px-4 py-3"
              type="url"
              placeholder="https://…"
              value={state.sourceUrl}
              onChange={(e) =>
                dispatch({ type: "field", field: "sourceUrl", value: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Resolution rule
            <textarea
              className="liquid-glass-input mt-2 min-h-28 w-full resize-y rounded-xl px-4 py-3"
              placeholder="Return YES if …, else NO."
              value={state.resolvePrompt}
              onChange={(e) =>
                dispatch({ type: "field", field: "resolvePrompt", value: e.target.value })
              }
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Deadline (minutes)
            <input
              type="number"
              min={1}
              className="liquid-glass-input mt-2 w-28 rounded-full px-4 py-2 text-center"
              value={state.deadlineMinutes}
              onChange={(e) =>
                dispatch({ type: "field", field: "deadlineMinutes", value: e.target.value })
              }
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "fillDemo" })}
              className="liquid-glass rounded-full px-5 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Use demo example
            </button>
            <button
              type="button"
              disabled={!account || !FACTORY_ADDRESS || state.busy}
              onClick={() => void createMarket()}
              className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {state.busy ? "Submitting…" : "Create on Somnia"}
            </button>
          </div>
        </div>

        {state.txHash && (
          <p className="mt-4 text-center text-xs">
            <a
              className="text-white/60 underline"
              href={blockscoutTxUrl(state.txHash)}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          </p>
        )}

        {state.marketAddress && (
          <Link
            href={`/market/${state.marketAddress}`}
            className="liquid-glass mt-4 block rounded-full py-3 text-center text-sm text-white hover:bg-white/5"
          >
            Go to your market →
          </Link>
        )}

        {state.error && (
          <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-200">
            {state.error}
          </p>
        )}
      </main>
    </VerdictShell>
  );
}
