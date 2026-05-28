import { formatEther, parseEther, type Address } from "viem";
import { AGENT_RECEIPTS_URL, BLOCK_EXPLORER, getConfigStatus } from "./config.js";
import {
  getAccountAddress,
  getFactoryAddress,
  getPublicClient,
  getWalletClient,
  factoryAbi,
  marketAbi,
  marketFromReceipt,
  waitReceipt,
} from "./client.js";
import { MIN_STAKE_WEI } from "./contracts.js";
import { formatActionError, runAction } from "./errors.js";
import { listFactoryMarketAddresses } from "./factory-read.js";
import { readMarketView } from "./market-read.js";
import { finishWriteAction, resolveNote, runMarketWrite, txLinks } from "./tx-actions.js";
import type { ActionResult, ConfigView, MarketView, WaitResult } from "./types.js";
import { parseAmountStt } from "./validate.js";

const RESOLVED_STATE = 2;

export type { ActionResult, MarketView, ConfigView };

export async function actionConfig(): Promise<
  ActionResult<{ config: ConfigView; account: string | null; ready: boolean }>
> {
  const config = getConfigStatus();
  let account: string | null = null;
  try {
    account = getAccountAddress();
  } catch {
    /* no key */
  }
  const ready = Boolean(config.privateKeyConfigured && config.factoryAddress);
  return { ok: true, config, account, ready };
}

export async function actionCreateMarket(params: {
  question: string;
  sourceUrl: string;
  resolvePrompt: string;
  deadlineMinutes?: number;
  deadlineUnix?: number;
}): Promise<
  ActionResult<{
    market: Address;
    deadline: number;
    factory: Address;
    explorerMarket: string;
    txHash: string;
    explorerTx: string;
  }>
> {
  return runAction(async () => {
    const deadline =
      params.deadlineUnix ??
      Math.floor(Date.now() / 1000) + (params.deadlineMinutes ?? 60) * 60;

    const wallet = getWalletClient();
    const factory = getFactoryAddress();

    const hash = await wallet.writeContract({
      address: factory,
      abi: factoryAbi,
      functionName: "createMarket",
      args: [params.question, params.sourceUrl, params.resolvePrompt, BigInt(deadline)],
    });

    const receipt = await waitReceipt(hash);
    const market = marketFromReceipt(receipt);
    if (!market) {
      return { ok: false, error: "MarketCreated event not found", ...txLinks(hash) };
    }

    return {
      ok: true,
      market,
      deadline,
      factory,
      explorerMarket: `${BLOCK_EXPLORER}/address/${market}`,
      ...txLinks(hash),
    };
  });
}

export async function actionStake(params: {
  market: Address;
  isYes: boolean;
  amountStt?: string;
}): Promise<
  ActionResult<{
    side: string;
    amountStt: string;
    market?: MarketView;
    txHash: string;
    explorerTx: string;
  }>
> {
  let value: bigint;
  try {
    value = parseEther(parseAmountStt(params.amountStt));
  } catch (e) {
    return { ok: false, error: formatActionError(e) };
  }
  if (value < MIN_STAKE_WEI) {
    return { ok: false, error: `Minimum stake is ${formatEther(MIN_STAKE_WEI)} STT` };
  }

  return runMarketWrite(
    () =>
      getWalletClient().writeContract({
        address: params.market,
        abi: marketAbi,
        functionName: "stake",
        args: [params.isYes],
        value,
      }),
    params.market,
    { side: params.isYes ? "YES" : "NO", amountStt: formatEther(value) }
  );
}

export async function actionResolve(params: {
  market: Address;
}): Promise<
  ActionResult<{
    depositStt: string;
    note: string;
    agentReceiptsUrl: string;
    market?: MarketView;
    txHash: string;
    explorerTx: string;
  }>
> {
  return runAction(async () => {
    const deposit = (await getPublicClient().readContract({
      address: params.market,
      abi: marketAbi,
      functionName: "requiredResolveDeposit",
    })) as bigint;
    const hash = await getWalletClient().writeContract({
      address: params.market,
      abi: marketAbi,
      functionName: "resolve",
      value: deposit,
    });
    return finishWriteAction(params.market, hash, {
      depositStt: formatEther(deposit),
      note: resolveNote(),
      agentReceiptsUrl: AGENT_RECEIPTS_URL,
    });
  });
}

export async function actionClaim(params: { market: Address }): Promise<
  ActionResult<{ market?: MarketView; txHash: string; explorerTx: string }>
> {
  return runMarketWrite(
    () =>
      getWalletClient().writeContract({
        address: params.market,
        abi: marketAbi,
        functionName: "claim",
      }),
    params.market,
    {}
  );
}

export async function actionStatus(params: {
  market: Address;
}): Promise<ActionResult<{ market: MarketView }>> {
  return runAction(async () => ({
    ok: true,
    market: await readMarketView(params.market),
  }));
}

export async function actionWait(params: {
  market: Address;
  timeoutSeconds?: number;
  pollSeconds?: number;
}): Promise<WaitResult> {
  const timeout = params.timeoutSeconds ?? 180;
  const poll = params.pollSeconds ?? 5;
  const start = Date.now();

  while ((Date.now() - start) / 1000 < timeout) {
    const market = await readMarketView(params.market);
    if (market.stateRaw === RESOLVED_STATE) {
      return {
        ok: true,
        resolved: true,
        waitedSeconds: Math.round((Date.now() - start) / 1000),
        market,
        agentReceiptsUrl: AGENT_RECEIPTS_URL,
      };
    }
    await new Promise((r) => setTimeout(r, poll * 1000));
  }

  const market = await readMarketView(params.market);
  return {
    ok: false,
    resolved: false,
    timedOut: true,
    error: `Timed out after ${timeout}s waiting for resolution`,
    waitedSeconds: timeout,
    market,
    agentReceiptsUrl: AGENT_RECEIPTS_URL,
  };
}

export async function actionListMarkets(): Promise<
  ActionResult<{
    factory: Address;
    count: number;
    markets: { index: number; address: Address }[];
    explorerFactory: string;
  }>
> {
  return runAction(async () => {
    const factory = getFactoryAddress();
    const addresses = await listFactoryMarketAddresses();
    return {
      ok: true,
      factory,
      count: addresses.length,
      markets: addresses.map((address, index) => ({ index, address })),
      explorerFactory: `${BLOCK_EXPLORER}/address/${factory}`,
    };
  });
}
