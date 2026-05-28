import type { Address, Hash } from "viem";

export type ActionFail = { ok: false; error: string };
export type ActionOk<T extends object> = { ok: true } & T;
export type ActionResult<T extends object> = ActionOk<T> | ActionFail;

export type WaitResult =
  | {
      ok: true;
      resolved: true;
      waitedSeconds: number;
      market: MarketView;
      agentReceiptsUrl: string;
    }
  | {
      ok: false;
      resolved: false;
      timedOut: true;
      error: string;
      waitedSeconds: number;
      market: MarketView;
      agentReceiptsUrl: string;
      canExpireResolution?: boolean;
    };

export type TxLinks = { txHash: Hash; explorerTx: string };

export type OperatorStakeView = {
  address: Address;
  yesStakeStt: string;
  noStakeStt: string;
  claimed: boolean;
  canClaim: boolean;
};

export type MarketView = {
  address: Address;
  question: string;
  state: string;
  stateRaw: number;
  outcome: string;
  outcomeRaw: number;
  agentReasoning: string | null;
  totalYesStakeStt: string;
  totalNoStakeStt: string;
  totalPoolStt: string;
  deadline: number;
  deadlineIso: string;
  pastDeadline: boolean;
  requiredResolveDepositStt: string;
  explorer: string;
  resolveStartedAt: number | null;
  lastResolveRequestId: string | null;
  agentReceiptUrl: string | null;
  canExpireResolution: boolean;
  operator?: OperatorStakeView;
};

export type ConfigView = {
  repoRoot: string;
  rpcUrl: string;
  chainId: number;
  factoryAddress: string | null;
  privateKeyConfigured: boolean;
  blockExplorer: string;
  agentReceiptsUrl: string;
};

export type DoctorCheck = {
  name: string;
  ok: boolean;
  detail: string;
};
