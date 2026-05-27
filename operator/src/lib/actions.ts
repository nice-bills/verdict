import { formatEther, parseEther, type Address, type Hash } from "viem";
import { AGENT_RECEIPTS_URL, BLOCK_EXPLORER } from "./config.js";
import {
  getAccountAddress,
  getFactoryAddress,
  getPublicClient,
  getWalletClient,
  marketAbi,
  marketFromReceipt,
  factoryAbi,
  waitReceipt,
} from "./client.js";
import { MIN_STAKE_WEI, OUTCOME_LABELS, STATE_LABELS } from "./contracts.js";
import { formatActionError, runAction } from "./errors.js";
import { parseAmountStt } from "./validate.js";

const RESOLVED_STATE = 2;

export type JsonResult = Record<string, unknown>;

function txLinks(hash: Hash) {
  return {
    txHash: hash,
    explorerTx: `${BLOCK_EXPLORER}/tx/${hash}`,
  };
}

export async function actionConfig(): Promise<JsonResult> {
  const { getConfigStatus } = await import("./config.js");
  const config = getConfigStatus();
  let account: string | null = null;
  try {
    account = getAccountAddress();
  } catch {
    /* no key */
  }
  return {
    ok: Boolean(config.privateKeyConfigured && config.factoryAddress),
    config,
    account,
    ready: Boolean(config.privateKeyConfigured && config.factoryAddress),
  };
}

export async function actionCreateMarket(params: {
  question: string;
  sourceUrl: string;
  resolvePrompt: string;
  deadlineMinutes?: number;
  deadlineUnix?: number;
}): Promise<JsonResult> {
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
}): Promise<JsonResult> {
  let value: bigint;
  try {
    value = parseEther(parseAmountStt(params.amountStt));
  } catch (e) {
    return { ok: false, error: formatActionError(e) };
  }
  if (value < MIN_STAKE_WEI) {
    return { ok: false, error: `Minimum stake is ${formatEther(MIN_STAKE_WEI)} STT` };
  }

  return runAction(async () => {
    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: params.market,
      abi: marketAbi,
      functionName: "stake",
      args: [params.isYes],
      value,
    });

    await waitReceipt(hash);
    let marketStatus: Record<string, unknown> | undefined;
    try {
      const status = await actionStatus({ market: params.market });
      marketStatus = status.market as Record<string, unknown>;
    } catch {
      /* tx succeeded; status read optional */
    }

    return {
      ok: true,
      side: params.isYes ? "YES" : "NO",
      amountStt: formatEther(value),
      ...txLinks(hash),
      ...(marketStatus ? { market: marketStatus } : {}),
    };
  });
}

export async function actionResolve(params: { market: Address }): Promise<JsonResult> {
  return runAction(async () => {
    const publicClient = getPublicClient();
    const deposit = await publicClient.readContract({
      address: params.market,
      abi: marketAbi,
      functionName: "requiredResolveDeposit",
    });

    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: params.market,
      abi: marketAbi,
      functionName: "resolve",
      value: deposit as bigint,
    });

    await waitReceipt(hash);
    let marketStatus: Record<string, unknown> | undefined;
    try {
      const status = await actionStatus({ market: params.market });
      marketStatus = status.market as Record<string, unknown>;
    } catch {
      /* optional */
    }

    return {
      ok: true,
      depositStt: formatEther(deposit as bigint),
      note: "Somnia agents are async on testnet — poll with `verdict status` or `verdict wait` (30–120s typical)",
      agentReceiptsUrl: AGENT_RECEIPTS_URL,
      ...txLinks(hash),
      ...(marketStatus ? { market: marketStatus } : {}),
    };
  });
}

export async function actionClaim(params: { market: Address }): Promise<JsonResult> {
  return runAction(async () => {
    const wallet = getWalletClient();
    const hash = await wallet.writeContract({
      address: params.market,
      abi: marketAbi,
      functionName: "claim",
    });

    await waitReceipt(hash);
    let marketStatus: Record<string, unknown> | undefined;
    try {
      const status = await actionStatus({ market: params.market });
      marketStatus = status.market as Record<string, unknown>;
    } catch {
      /* optional */
    }

    return {
      ok: true,
      ...txLinks(hash),
      ...(marketStatus ? { market: marketStatus } : {}),
    };
  });
}

export async function actionStatus(params: { market: Address }): Promise<JsonResult> {
  const publicClient = getPublicClient();
  const m = params.market;

  let operatorAccount: Address | null = null;
  try {
    operatorAccount = getAccountAddress();
  } catch {
    /* no PRIVATE_KEY */
  }

  const reads: Promise<unknown>[] = [
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "question" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "state" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "outcome" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "agentReasoning" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "totalYesStake" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "totalNoStake" }),
    publicClient.readContract({ address: m, abi: marketAbi, functionName: "deadline" }),
    publicClient.readContract({
      address: m,
      abi: marketAbi,
      functionName: "requiredResolveDeposit",
    }),
  ];

  if (operatorAccount) {
    reads.push(
      publicClient.readContract({
        address: m,
        abi: marketAbi,
        functionName: "yesStake",
        args: [operatorAccount],
      }),
      publicClient.readContract({
        address: m,
        abi: marketAbi,
        functionName: "noStake",
        args: [operatorAccount],
      }),
      publicClient.readContract({
        address: m,
        abi: marketAbi,
        functionName: "claimed",
        args: [operatorAccount],
      })
    );
  }

  const results = await Promise.all(reads);
  const [question, state, outcome, reasoning, totalYes, totalNo, deadline, deposit] = results;

  const stateNum = Number(state);
  const outcomeNum = Number(outcome);
  const now = Math.floor(Date.now() / 1000);
  const deadlineNum = Number(deadline);
  const resolved = stateNum === RESOLVED_STATE;

  const market: Record<string, unknown> = {
    address: m,
    question: question as string,
    state: STATE_LABELS[stateNum] ?? stateNum,
    stateRaw: stateNum,
    outcome: OUTCOME_LABELS[outcomeNum] ?? outcomeNum,
    outcomeRaw: outcomeNum,
    agentReasoning: (reasoning as string) || null,
    totalYesStakeStt: formatEther(totalYes as bigint),
    totalNoStakeStt: formatEther(totalNo as bigint),
    totalPoolStt: formatEther((totalYes as bigint) + (totalNo as bigint)),
    deadline: deadlineNum,
    deadlineIso: new Date(deadlineNum * 1000).toISOString(),
    pastDeadline: now >= deadlineNum,
    requiredResolveDepositStt: formatEther(deposit as bigint),
    explorer: `${BLOCK_EXPLORER}/address/${m}`,
  };

  if (operatorAccount && results.length >= 11) {
    const yesStake = results[8] as bigint;
    const noStake = results[9] as bigint;
    const claimed = results[10] as boolean;
    const hasStake = yesStake > 0n || noStake > 0n;
    market.operator = {
      address: operatorAccount,
      yesStakeStt: formatEther(yesStake),
      noStakeStt: formatEther(noStake),
      claimed,
      canClaim: resolved && hasStake && !claimed,
    };
  }

  return { ok: true, market };
}

export async function actionWait(params: {
  market: Address;
  timeoutSeconds?: number;
  pollSeconds?: number;
}): Promise<JsonResult> {
  const timeout = params.timeoutSeconds ?? 180;
  const poll = params.pollSeconds ?? 5;
  const start = Date.now();

  while ((Date.now() - start) / 1000 < timeout) {
    const status = await actionStatus({ market: params.market });
    const stateRaw = (status.market as { stateRaw: number }).stateRaw;
    if (stateRaw === RESOLVED_STATE) {
      return {
        ok: true,
        resolved: true,
        waitedSeconds: Math.round((Date.now() - start) / 1000),
        market: status.market,
        agentReceiptsUrl: AGENT_RECEIPTS_URL,
      };
    }
    await new Promise((r) => setTimeout(r, poll * 1000));
  }

  const status = await actionStatus({ market: params.market });
  return {
    ok: false,
    resolved: false,
    timedOut: true,
    error: `Timed out after ${timeout}s waiting for resolution`,
    waitedSeconds: timeout,
    market: status.market,
    agentReceiptsUrl: AGENT_RECEIPTS_URL,
  };
}

export async function actionListMarkets(): Promise<JsonResult> {
  return runAction(async () => {
    const publicClient = getPublicClient();
    const factory = getFactoryAddress();
    const count = (await publicClient.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "marketCount",
    })) as bigint;

    const markets: { index: number; address: Address }[] = [];
    for (let i = 0n; i < count; i++) {
      const address = (await publicClient.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [i],
      })) as Address;
      markets.push({ index: Number(i), address });
    }

    return {
      ok: true,
      factory,
      count: Number(count),
      markets,
      explorerFactory: `${BLOCK_EXPLORER}/address/${factory}`,
    };
  });
}
