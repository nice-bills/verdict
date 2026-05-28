#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Address } from "viem";
import {
  actionClaim,
  actionConfig,
  actionCreateMarket,
  actionDoctor,
  actionExpireResolution,
  actionListMarkets,
  actionResolve,
  actionStake,
  actionStatus,
  actionWait,
} from "./lib/actions.js";
import { formatActionError } from "./lib/errors.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address");

function jsonText(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2),
      },
    ],
  };
}

async function safeTool<T>(fn: () => Promise<T>): Promise<ReturnType<typeof jsonText>> {
  try {
    return jsonText(await fn());
  } catch (e) {
    return jsonText({ ok: false, error: formatActionError(e) });
  }
}

const server = new McpServer({
  name: "verdict",
  version: "0.1.0",
});

server.tool(
  "verdict_get_config",
  "Check Verdict operator env: RPC, factory address, whether PRIVATE_KEY is set. Run before other tools.",
  {},
  async () => safeTool(() => actionConfig())
);

server.tool(
  "verdict_doctor",
  "Diagnose RPC connectivity, chain id, factory bytecode, market count, and wallet balance.",
  {},
  async () => safeTool(() => actionDoctor())
);

server.tool(
  "verdict_list_markets",
  "List all VerdictMarket addresses created by the factory.",
  {},
  async () => safeTool(() => actionListMarkets())
);

server.tool(
  "verdict_create_market",
  "Deploy a new VerdictMarket via the factory. Returns market address and tx links.",
  {
    question: z.string().describe("Prediction market question"),
    sourceUrl: z.string().url().describe("URL the Somnia LLM Parse Website agent will fetch"),
    resolvePrompt: z.string().describe("Plain-English rule for YES vs NO vs INVALID"),
    deadlineMinutes: z.number().int().positive().optional().describe("Minutes until deadline (default 60)"),
    deadlineUnix: z.number().int().positive().optional().describe("Unix deadline (overrides deadlineMinutes)"),
  },
  async (args) =>
    safeTool(() =>
      actionCreateMarket({
        question: args.question,
        sourceUrl: args.sourceUrl,
        resolvePrompt: args.resolvePrompt,
        deadlineMinutes: args.deadlineMinutes,
        deadlineUnix: args.deadlineUnix,
      })
    )
);

server.tool(
  "verdict_stake",
  "Stake STT on YES or NO before the market deadline.",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
    side: z.enum(["YES", "NO"]),
    amountStt: z.string().optional().describe("Stake in STT (default 0.01)"),
  },
  async (args) =>
    safeTool(() =>
      actionStake({
        market: args.market as Address,
        isYes: args.side === "YES",
        amountStt: args.amountStt,
      })
    )
);

server.tool(
  "verdict_resolve",
  "Call resolve() after deadline — triggers Somnia LLM Parse Website agent (async 30–120s on testnet).",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
  },
  async (args) => safeTool(() => actionResolve({ market: args.market as Address }))
);

server.tool(
  "verdict_get_outcome",
  "Read market status: state, outcome, pools, agent reasoning. Same as verdict_status.",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
  },
  async (args) => safeTool(() => actionStatus({ market: args.market as Address }))
);

server.tool(
  "verdict_status",
  "Alias for verdict_get_outcome — read market state and agent reasoning.",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
  },
  async (args) => safeTool(() => actionStatus({ market: args.market as Address }))
);

server.tool(
  "verdict_wait_resolved",
  "Poll until market state is Resolved or timeout (default 180s).",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
    timeoutSeconds: z.number().int().positive().optional(),
    pollSeconds: z.number().int().positive().optional(),
  },
  async (args) =>
    safeTool(() =>
      actionWait({
        market: args.market as Address,
        timeoutSeconds: args.timeoutSeconds,
        pollSeconds: args.pollSeconds,
      })
    )
);

server.tool(
  "verdict_claim",
  "Claim payout after market is Resolved (winners or INVALID refund).",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
  },
  async (args) => safeTool(() => actionClaim({ market: args.market as Address }))
);

server.tool(
  "verdict_expire_resolution",
  "If market is stuck Resolving for 2+ hours, finalize as INVALID so stakers can claim refunds.",
  {
    market: addressSchema.describe("VerdictMarket contract address"),
  },
  async (args) => safeTool(() => actionExpireResolution({ market: args.market as Address }))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
