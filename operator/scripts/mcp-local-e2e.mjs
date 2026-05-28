#!/usr/bin/env node
/**
 * Local MCP E2E: spawn verdict-mcp, exercise all tools against Anvil + mock platform.
 */
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const OPERATOR_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(OPERATOR_ROOT, "..");
const RPC = "http://127.0.0.1:8545";
const ANVIL_PK = process.env.ANVIL_DEV_PRIVATE_KEY;
if (!ANVIL_PK) {
  throw new Error(
    "ANVIL_DEV_PRIVATE_KEY is required (same as scripts/local-agent-e2e.sh ANVIL_PK)"
  );
}

const EXPECTED_TOOLS = [
  "verdict_get_config",
  "verdict_doctor",
  "verdict_list_markets",
  "verdict_create_market",
  "verdict_stake",
  "verdict_resolve",
  "verdict_get_outcome",
  "verdict_status",
  "verdict_wait_resolved",
  "verdict_claim",
  "verdict_expire_resolution",
];

function parseToolJson(result) {
  const block = result?.content?.find((c) => c.type === "text");
  if (!block?.text) throw new Error("MCP tool returned no text content");
  return JSON.parse(block.text);
}

async function ensureAnvil() {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
    });
    if (res.ok) return;
  } catch {
    /* start */
  }
  const proc = spawn("anvil", ["--port", "8545"], { detached: true, stdio: "ignore" });
  proc.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(RPC, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1,
        }),
      });
      if (res.ok) return;
    } catch {
      /* retry */
    }
  }
  throw new Error("Anvil did not become ready");
}

function deployFactory() {
  const out = execSync(
    `forge script script/DeployLocal.s.sol:DeployLocal --rpc-url "${RPC}" --broadcast -vv`,
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, PRIVATE_KEY: ANVIL_PK },
    }
  );
  const platform = out.match(/MOCK_PLATFORM\s+(\S+)/)?.[1];
  const factory = out.match(/VerdictFactory\s+(\S+)/)?.[1];
  if (!factory) throw new Error("Could not parse VerdictFactory from deploy output");
  return { factory, platform };
}

function cast(args) {
  execSync(`cast ${args}`, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, PRIVATE_KEY: ANVIL_PK },
  });
}

function blockTimestamp() {
  return Number(
    execSync(`cast block latest --rpc-url "${RPC}" -f timestamp`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim()
  );
}

async function main() {
  await ensureAnvil();
  const { factory, platform } = deployFactory();

  const env = {
    ...process.env,
    PRIVATE_KEY: ANVIL_PK,
    SOMNIA_RPC_URL: RPC,
    SOMNIA_CHAIN_ID: "31337",
    FACTORY_ADDRESS: factory,
  };

  const transport = new StdioClientTransport({
    command: "node",
    args: [join(OPERATOR_ROOT, "dist/mcp-server.js")],
    env,
    stderr: "pipe",
  });

  const client = new Client({ name: "mcp-local-e2e", version: "1.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  const missing = EXPECTED_TOOLS.filter((n) => !names.includes(n));
  if (missing.length) throw new Error(`Missing MCP tools: ${missing.join(", ")}`);
  console.log("OK listTools");

  const cfg = parseToolJson(await client.callTool({ name: "verdict_get_config", arguments: {} }));
  if (!cfg.ok || !cfg.ready) throw new Error(`config not ready: ${JSON.stringify(cfg)}`);

  const doc = parseToolJson(await client.callTool({ name: "verdict_doctor", arguments: {} }));
  if (!doc.ok || !doc.ready) throw new Error(`doctor failed: ${JSON.stringify(doc)}`);
  console.log("OK verdict_get_config / verdict_doctor");

  const deadlineUnix = blockTimestamp() + 600;
  const created = parseToolJson(
    await client.callTool({
      name: "verdict_create_market",
      arguments: {
        question: "MCP local E2E market?",
        sourceUrl: "https://example.com",
        resolvePrompt: "Return YES, NO, or INVALID per the rule.",
        deadlineUnix,
      },
    })
  );
  if (!created.ok || !created.market) throw new Error(`create failed: ${JSON.stringify(created)}`);
  const market = created.market;
  console.log("OK verdict_create_market");

  const listed = parseToolJson(
    await client.callTool({ name: "verdict_list_markets", arguments: {} })
  );
  const listedAddrs = (listed.markets ?? []).map((m) =>
    typeof m === "string" ? m : m.address
  );
  if (!listed.ok || !listedAddrs.includes(market)) {
    throw new Error(`list_markets missing market: ${JSON.stringify(listed)}`);
  }
  console.log("OK verdict_list_markets");

  const staked = parseToolJson(
    await client.callTool({
      name: "verdict_stake",
      arguments: { market, side: "YES", amountStt: "0.01" },
    })
  );
  if (!staked.ok) throw new Error(`stake failed: ${JSON.stringify(staked)}`);
  console.log("OK verdict_stake");

  const nowTs = blockTimestamp();
  const warpSec = Math.max(1, deadlineUnix - nowTs + 5);
  cast(`rpc evm_increaseTime ${warpSec} --rpc-url "${RPC}"`);
  cast(`rpc evm_mine --rpc-url "${RPC}"`);

  const resolved = parseToolJson(
    await client.callTool({ name: "verdict_resolve", arguments: { market } })
  );
  if (!resolved.ok) throw new Error(`resolve failed: ${JSON.stringify(resolved)}`);
  console.log("OK verdict_resolve");

  if (platform) {
    cast(
      `send "${platform}" "deliverResponse(uint256)" 1 --rpc-url "${RPC}" --private-key "${ANVIL_PK}"`
    );
  }

  const waited = parseToolJson(
    await client.callTool({
      name: "verdict_wait_resolved",
      arguments: { market, timeoutSeconds: 30, pollSeconds: 1 },
    })
  );
  if (!waited.ok || !waited.resolved || waited.market?.outcome !== "YES") {
    throw new Error(`wait failed: ${JSON.stringify(waited)}`);
  }
  console.log("OK verdict_wait_resolved");

  const claimed = parseToolJson(
    await client.callTool({ name: "verdict_claim", arguments: { market } })
  );
  if (!claimed.ok) throw new Error(`claim failed: ${JSON.stringify(claimed)}`);
  console.log("OK verdict_claim");

  await client.close();
  console.log("\nMCP local E2E OK");
}

main().catch((e) => {
  console.error("MCP local E2E FAILED:", e);
  process.exit(1);
});
