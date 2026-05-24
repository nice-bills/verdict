#!/usr/bin/env node
import { Command } from "commander";
import type { Address } from "viem";
import {
  actionClaim,
  actionConfig,
  actionCreateMarket,
  actionResolve,
  actionStake,
  actionStatus,
  actionWait,
} from "./lib/actions.js";
import { emit, emitError } from "./lib/output.js";

const program = new Command();

program
  .name("verdict")
  .description("Operator CLI for Verdict markets on Somnia (JSON by default for agents)")
  .option("--json", "Force JSON output")
  .hook("preAction", () => {
    if (program.opts().json) process.env.VERDICT_JSON = "1";
  });

program
  .command("config")
  .description("Show env / factory / account readiness")
  .action(async () => {
    try {
      const r = await actionConfig();
      emit(
        r,
        `RPC: ${(r.config as { rpcUrl: string }).rpcUrl}\nFactory: ${(r.config as { factoryAddress: string | null }).factoryAddress ?? "NOT SET"}\nAccount: ${r.account}`
      );
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("create")
  .description("Create a new prediction market via VerdictFactory")
  .requiredOption("-q, --question <text>", "Market question")
  .requiredOption("-u, --url <url>", "Source URL for the Somnia parse agent")
  .requiredOption("-r, --rule <text>", "Resolution rule (plain English)")
  .option("-m, --minutes <n>", "Deadline minutes from now", "60")
  .option("-d, --deadline <unix>", "Deadline unix timestamp (overrides --minutes)")
  .action(async (opts) => {
    try {
      const r = await actionCreateMarket({
        question: opts.question,
        sourceUrl: opts.url,
        resolvePrompt: opts.rule,
        deadlineMinutes: opts.deadline ? undefined : Number(opts.minutes),
        deadlineUnix: opts.deadline ? Number(opts.deadline) : undefined,
      });
      emit(
        r,
        r.ok
          ? `Market created: ${r.market}\nTx: ${r.explorerTx}`
          : `Failed: ${r.error}`
      );
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("stake")
  .description("Stake YES or NO on a market")
  .requiredOption("--market <address>", "VerdictMarket contract address")
  .option("--yes", "Stake on YES")
  .option("--no", "Stake on NO")
  .option("-a, --amount <stt>", "Stake amount in STT", "0.01")
  .action(async (opts) => {
    if (!opts.yes && !opts.no) {
      emitError("Specify --yes or --no");
      return;
    }
    if (opts.yes && opts.no) {
      emitError("Use only one of --yes or --no");
      return;
    }
    try {
      const r = await actionStake({
        market: opts.market as Address,
        isYes: Boolean(opts.yes),
        amountStt: opts.amount,
      });
      emit(r, r.ok ? `Staked ${r.side} ${r.amountStt} STT` : `Failed: ${r.error}`);
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("resolve")
  .description("Trigger Somnia agent resolution (after deadline)")
  .requiredOption("--market <address>", "VerdictMarket address")
  .action(async (opts) => {
    try {
      const r = await actionResolve({ market: opts.market as Address });
      emit(r, r.ok ? `Resolve submitted. ${r.note}` : `Failed: ${r.error}`);
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("claim")
  .description("Claim winnings or refund after resolution")
  .requiredOption("--market <address>", "VerdictMarket address")
  .action(async (opts) => {
    try {
      const r = await actionClaim({ market: opts.market as Address });
      emit(r, r.ok ? `Claim tx: ${r.explorerTx}` : `Failed: ${r.error}`);
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("status")
  .description("Read market state (pools, outcome, agent reasoning)")
  .requiredOption("--market <address>", "VerdictMarket address")
  .action(async (opts) => {
    try {
      const r = await actionStatus({ market: opts.market as Address });
      const m = r.market as Record<string, unknown>;
      emit(
        r,
        `State: ${m.state} | Outcome: ${m.outcome}\nPool: ${m.totalPoolStt} STT (YES ${m.totalYesStakeStt} / NO ${m.totalNoStakeStt})\n${m.agentReasoning ?? ""}`
      );
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("wait")
  .description("Poll until market is Resolved or timeout")
  .requiredOption("--market <address>", "VerdictMarket address")
  .option("-t, --timeout <sec>", "Max wait seconds", "180")
  .option("-p, --poll <sec>", "Poll interval seconds", "5")
  .action(async (opts) => {
    try {
      const r = await actionWait({
        market: opts.market as Address,
        timeoutSeconds: Number(opts.timeout),
        pollSeconds: Number(opts.poll),
      });
      emit(
        r,
        r.resolved
          ? `Resolved: ${(r.market as { outcome: string }).outcome}`
          : `Timed out after ${r.waitedSeconds}s — check ${r.agentReceiptsUrl}`
      );
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program.parse();
