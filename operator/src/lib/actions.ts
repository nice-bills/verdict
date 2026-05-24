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
}

export async function actionStake(params: {
  market: Address;
  isYes: boolean;
  amountStt?: string;
}): Promise<JsonResult> {
  const value = params.amountStt ? parseEther(params.amountStt) : parseEther("0.01");
  if (value < MIN_STAKE_WEI) {
    return { ok: false, error: `Minimum stake is ${formatEther(MIN_STAKE_WEI)} STT` };
  }

  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: params.market,
    abi: marketAbi,
    functionName: "stake",
    args: [params.isYes],
    value,
  });

  await waitReceipt(hash);
  const status = await actionStatus({ market: params.market });

  return {
    ok: true,
    side: params.isYes ? "YES" : "NO",
    amountStt: formatEther(value),
    ...txLinks(hash),
    market: status.market,
  };
}

export async function actionResolve(params: { market: Address }): Promise<JsonResult> {
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

  const receipt = await waitReceipt(hash);
  const status = await actionStatus({ market: params.market });

  return {
    ok: true,
    depositStt: formatEther(deposit as bigint),
    note: "Somnia agents are async on testnet — poll with `verdict status` or `verdict wait` (30–120s typical)",
    agentReceiptsUrl: AGENT_RECEIPTS_URL,
    ...txLinks(hash),
    market: status.market,
  };
}

export async function actionClaim(params: { market: Address }): Promise<JsonResult> {
  const wallet = getWalletClient();
  const hash = await wallet.writeContract({
    address: params.market,
    abi: marketAbi,
    functionName: "claim",
  });

  await waitReceipt(hash);
  const status = await actionStatus({ market: params.market });

  return {
    ok: true,
    ...txLinks(hash),
    market: status.market,
  };
}

export async function actionStatus(params: { market: Address }): Promise<JsonResult> {
  const publicClient = getPublicClient();
  const m = params.market;

  const [question, state, outcome, reasoning, totalYes, totalNo, deadline, deposit] =
    await publicClient.multicall({
      contracts: [
        { address: m, abi: marketAbi, functionName: "question" },
        { address: m, abi: marketAbi, functionName: "state" },
        { address: m, abi: marketAbi, functionName: "outcome" },
        { address: m, abi: marketAbi, functionName: "agentReasoning" },
        { address: m, abi: marketAbi, functionName: "totalYesStake" },
        { address: m, abi: marketAbi, functionName: "totalNoStake" },
        { address: m, abi: marketAbi, functionName: "deadline" },
        { address: m, abi: marketAbi, functionName: "requiredResolveDeposit" },
      ],
    });

  const stateNum = Number(state.result);
  const outcomeNum = Number(outcome.result);
  const now = Math.floor(Date.now() / 1000);
  const deadlineNum = Number(deadline.result);

  return {
    ok: true,
    market: {
      address: m,
      question: question.result as string,
      state: STATE_LABELS[stateNum] ?? stateNum,
      stateRaw: stateNum,
      outcome: OUTCOME_LABELS[outcomeNum] ?? outcomeNum,
      outcomeRaw: outcomeNum,
      agentReasoning: (reasoning.result as string) || null,
      totalYesStakeStt: formatEther(totalYes.result as bigint),
      totalNoStakeStt: formatEther(totalNo.result as bigint),
      totalPoolStt: formatEther(
        (totalYes.result as bigint) + (totalNo.result as bigint)
      ),
      deadline: deadlineNum,
      deadlineIso: new Date(deadlineNum * 1000).toISOString(),
      pastDeadline: now >= deadlineNum,
      requiredResolveDepositStt: formatEther(deposit.result as bigint),
      explorer: `${BLOCK_EXPLORER}/address/${m}`,
    },
  };
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
    if (stateRaw === 2) {
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
    ok: true,
    resolved: false,
    timedOut: true,
    waitedSeconds: timeout,
    market: status.market,
    agentReceiptsUrl: AGENT_RECEIPTS_URL,
  };
}
