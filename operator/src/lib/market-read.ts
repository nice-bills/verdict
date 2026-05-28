import { formatEther, type Address } from "viem";
import { AGENT_RECEIPTS_URL, BLOCK_EXPLORER } from "./config.js";
import { getAccountAddress, getPublicClient } from "./client.js";
import { marketAbi, OUTCOME_LABELS, STATE_LABELS } from "./contracts.js";
import type { MarketView, OperatorStakeView } from "./types.js";

const RESOLVED_STATE = 2;
const RESOLVING_STATE = 1;
const RESOLVE_TIMEOUT_SEC = 2 * 60 * 60;

type RawMarketFields = {
  question: string;
  state: bigint;
  outcome: bigint;
  reasoning: string;
  totalYes: bigint;
  totalNo: bigint;
  deadline: bigint;
  deposit: bigint;
  resolveStartedAt: bigint;
  lastResolveRequestId: bigint;
};

async function readRawMarket(market: Address): Promise<RawMarketFields> {
  const client = getPublicClient();
  const [
    question,
    state,
    outcome,
    reasoning,
    totalYes,
    totalNo,
    deadline,
    deposit,
    resolveStartedAt,
    lastResolveRequestId,
  ] = await Promise.all([
    client.readContract({ address: market, abi: marketAbi, functionName: "question" }),
    client.readContract({ address: market, abi: marketAbi, functionName: "state" }),
    client.readContract({ address: market, abi: marketAbi, functionName: "outcome" }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "agentReasoning",
    }),
    client.readContract({ address: market, abi: marketAbi, functionName: "totalYesStake" }),
    client.readContract({ address: market, abi: marketAbi, functionName: "totalNoStake" }),
    client.readContract({ address: market, abi: marketAbi, functionName: "deadline" }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "requiredResolveDeposit",
    }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "resolveStartedAt",
    }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "lastResolveRequestId",
    }),
  ]);

  return {
    question: question as string,
    state: state as bigint,
    outcome: outcome as bigint,
    reasoning: reasoning as string,
    totalYes: totalYes as bigint,
    totalNo: totalNo as bigint,
    deadline: deadline as bigint,
    deposit: deposit as bigint,
    resolveStartedAt: resolveStartedAt as bigint,
    lastResolveRequestId: lastResolveRequestId as bigint,
  };
}

function agentReceiptUrl(requestId: bigint): string | null {
  if (requestId === 0n) return null;
  return `${AGENT_RECEIPTS_URL}/request/${requestId.toString()}`;
}

async function readOperatorStake(
  market: Address,
  account: Address,
  resolved: boolean
): Promise<OperatorStakeView> {
  const client = getPublicClient();
  const [yesStake, noStake, claimed] = await Promise.all([
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "yesStake",
      args: [account],
    }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "noStake",
      args: [account],
    }),
    client.readContract({
      address: market,
      abi: marketAbi,
      functionName: "claimed",
      args: [account],
    }),
  ]);
  const yes = yesStake as bigint;
  const no = noStake as bigint;
  const hasStake = yes > 0n || no > 0n;
  return {
    address: account,
    yesStakeStt: formatEther(yes),
    noStakeStt: formatEther(no),
    claimed: claimed as boolean,
    canClaim: resolved && hasStake && !(claimed as boolean),
  };
}

export function formatMarketView(
  market: Address,
  raw: RawMarketFields,
  operator?: OperatorStakeView
): MarketView {
  const stateNum = Number(raw.state);
  const outcomeNum = Number(raw.outcome);
  const deadlineNum = Number(raw.deadline);
  const now = Math.floor(Date.now() / 1000);
  const resolveStartedNum = Number(raw.resolveStartedAt);
  const requestId = raw.lastResolveRequestId;
  const canExpire =
    stateNum === RESOLVING_STATE &&
    resolveStartedNum > 0 &&
    now >= resolveStartedNum + RESOLVE_TIMEOUT_SEC;

  return {
    address: market,
    question: raw.question,
    state: STATE_LABELS[stateNum] ?? String(stateNum),
    stateRaw: stateNum,
    outcome: OUTCOME_LABELS[outcomeNum] ?? String(outcomeNum),
    outcomeRaw: outcomeNum,
    agentReasoning: raw.reasoning || null,
    totalYesStakeStt: formatEther(raw.totalYes),
    totalNoStakeStt: formatEther(raw.totalNo),
    totalPoolStt: formatEther(raw.totalYes + raw.totalNo),
    deadline: deadlineNum,
    deadlineIso: new Date(deadlineNum * 1000).toISOString(),
    pastDeadline: now >= deadlineNum,
    requiredResolveDepositStt: formatEther(raw.deposit),
    explorer: `${BLOCK_EXPLORER}/address/${market}`,
    resolveStartedAt: resolveStartedNum > 0 ? resolveStartedNum : null,
    lastResolveRequestId: requestId > 0n ? requestId.toString() : null,
    agentReceiptUrl: agentReceiptUrl(requestId),
    canExpireResolution: canExpire,
    ...(operator ? { operator } : {}),
  };
}

export async function readMarketView(market: Address): Promise<MarketView> {
  const raw = await readRawMarket(market);
  const resolved = Number(raw.state) === RESOLVED_STATE;

  let operator: OperatorStakeView | undefined;
  try {
    const account = getAccountAddress();
    operator = await readOperatorStake(market, account, resolved);
  } catch {
    /* no PRIVATE_KEY */
  }

  return formatMarketView(market, raw, operator);
}
