import type { Address } from "viem";
import { publicClient } from "@/lib/clients";
import { FACTORY_ADDRESS, factoryAbi, marketAbi } from "@/lib/contracts";
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

export type MarketSummary = {
  address: Address;
  question: string;
  state: number;
  outcome: number;
  totalYesStake: bigint;
  totalNoStake: bigint;
  deadline: bigint;
};

export async function fetchMarketSnapshot(market: Address): Promise<MarketSnapshot> {
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
    publicClient.readContract({ address: market, abi: marketAbi, functionName: "totalYesStake" }),
    publicClient.readContract({ address: market, abi: marketAbi, functionName: "totalNoStake" }),
    publicClient.readContract({ address: market, abi: marketAbi, functionName: "deadline" }),
    publicClient.readContract({
      address: market,
      abi: marketAbi,
      functionName: "requiredResolveDeposit",
    }),
  ]);

  return {
    question: question as string,
    state: Number(state),
    outcome: Number(outcome),
    reasoning: reasoning as string,
    totalYesStake: totalYesStake as bigint,
    totalNoStake: totalNoStake as bigint,
    deadline: deadline as bigint,
    resolveDeposit: resolveDeposit as bigint,
  };
}

export async function fetchMarketSummary(address: Address): Promise<MarketSummary> {
  const [question, state, outcome, totalYesStake, totalNoStake, deadline] = await Promise.all([
    publicClient.readContract({ address, abi: marketAbi, functionName: "question" }),
    publicClient.readContract({ address, abi: marketAbi, functionName: "state" }),
    publicClient.readContract({ address, abi: marketAbi, functionName: "outcome" }),
    publicClient.readContract({ address, abi: marketAbi, functionName: "totalYesStake" }),
    publicClient.readContract({ address, abi: marketAbi, functionName: "totalNoStake" }),
    publicClient.readContract({ address, abi: marketAbi, functionName: "deadline" }),
  ]);

  return {
    address,
    question: question as string,
    state: Number(state),
    outcome: Number(outcome),
    totalYesStake: totalYesStake as bigint,
    totalNoStake: totalNoStake as bigint,
    deadline: deadline as bigint,
  };
}

export async function listFactoryMarketAddresses(): Promise<Address[]> {
  const factory = FACTORY_ADDRESS;
  if (!factory) return [];

  const count = (await publicClient.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "marketCount",
  })) as bigint;
  const n = Number(count);
  if (n === 0) return [];

  const indices = Array.from({ length: n }, (_, i) => BigInt(i));
  const addresses = await Promise.all(
    indices.map((i) =>
      publicClient.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [i],
      })
    )
  );
  return addresses as Address[];
}
