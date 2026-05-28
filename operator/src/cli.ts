#!/usr/bin/env node
import { createRequire } from "node:module";
import { Command } from "commander";
import {
  actionClaim,
  actionConfig,
  actionCreateMarket,
  actionListMarkets,
  actionResolve,
  actionStake,
  actionStatus,
  actionWait,
} from "./lib/actions.js";
import { emit, emitError } from "./lib/output.js";
import { parseMarketAddress, parsePositiveInt } from "./lib/validate.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const program = new Command();

program
  .name("verdict")
  .version(version)
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
        r.ok
          ? `RPC: ${r.config.rpcUrl}\nFactory: ${r.config.factoryAddress ?? "NOT SET"}\nAccount: ${r.account ?? "—"}`
          : `Failed: ${r.error}`
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
        deadlineMinutes: opts.deadline
          ? undefined
          : parsePositiveInt(opts.minutes, "minutes", 60),
        deadlineUnix: opts.deadline
          ? parsePositiveInt(opts.deadline, "deadline", 0)
          : undefined,
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
        market: parseMarketAddress(opts.market),
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
      const r = await actionResolve({ market: parseMarketAddress(opts.market) });
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
      const r = await actionClaim({ market: parseMarketAddress(opts.market) });
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
      const r = await actionStatus({ market: parseMarketAddress(opts.market) });
      emit(
        r,
        r.ok
          ? `State: ${r.market.state} | Outcome: ${r.market.outcome}\nPool: ${r.market.totalPoolStt} STT (YES ${r.market.totalYesStakeStt} / NO ${r.market.totalNoStakeStt})\n${r.market.agentReasoning ?? ""}`
          : `Failed: ${r.error}`
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
        market: parseMarketAddress(opts.market),
        timeoutSeconds: parsePositiveInt(opts.timeout, "timeout", 180),
        pollSeconds: parsePositiveInt(opts.poll, "poll", 5),
      });
      if (r.ok && r.resolved) {
        emit(r, `Resolved: ${r.market.outcome}`);
      } else {
        emit(
          r,
          `Timed out after ${r.waitedSeconds}s — check ${r.agentReceiptsUrl}`
        );
        process.exitCode = 1;
      }
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program
  .command("markets")
  .alias("list")
  .description("List markets deployed by the factory")
  .action(async () => {
    try {
      const r = await actionListMarkets();
      emit(
        r,
        r.ok
          ? `Factory ${r.factory}: ${r.count} market(s)`
          : `Failed: ${r.error}`
      );
    } catch (e) {
      emitError(e instanceof Error ? e.message : String(e));
    }
  });

program.parse();
