import { formatEther, type Address } from "viem";
import { getConfigStatus, getFactoryAddress, RPC_URL, CHAIN_ID } from "./config.js";
import { getAccountAddress, getPublicClient } from "./client.js";
import { marketAbi } from "./contracts.js";
import { listFactoryMarketAddresses } from "./factory-read.js";
import type { ActionResult, DoctorCheck } from "./types.js";
import { runAction } from "./errors.js";

export async function actionDoctor(): Promise<
  ActionResult<{ checks: DoctorCheck[]; ready: boolean }>
> {
  return runAction(async () => {
    const checks: DoctorCheck[] = [];
    const config = getConfigStatus();

    checks.push({
      name: "private_key",
      ok: config.privateKeyConfigured,
      detail: config.privateKeyConfigured ? "PRIVATE_KEY set" : "PRIVATE_KEY missing in .env",
    });

    checks.push({
      name: "factory_address",
      ok: Boolean(config.factoryAddress),
      detail: config.factoryAddress
        ? `Factory ${config.factoryAddress}`
        : "Set FACTORY_ADDRESS or deploy (deployments/shannon.json)",
    });

    let rpcOk = false;
    let rpcChainId: number | null = null;
    try {
      const client = getPublicClient();
      rpcChainId = await client.getChainId();
      rpcOk = true;
      checks.push({
        name: "rpc",
        ok: true,
        detail: `${RPC_URL} (chainId ${rpcChainId})`,
      });
    } catch (e) {
      checks.push({
        name: "rpc",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    if (rpcOk && rpcChainId !== null) {
      checks.push({
        name: "chain_id",
        ok: rpcChainId === CHAIN_ID,
        detail:
          rpcChainId === CHAIN_ID
            ? `SOMNIA_CHAIN_ID=${CHAIN_ID} matches RPC`
            : `RPC chainId ${rpcChainId} != SOMNIA_CHAIN_ID ${CHAIN_ID}`,
      });
    }

    if (config.factoryAddress && rpcOk) {
      try {
        const factory = getFactoryAddress();
        const code = await getPublicClient().getBytecode({ address: factory });
        checks.push({
          name: "factory_code",
          ok: Boolean(code && code !== "0x"),
          detail:
            code && code !== "0x" ? "Factory contract bytecode present" : "No code at factory address",
        });

        const count = await listFactoryMarketAddresses();
        checks.push({
          name: "factory_markets",
          ok: true,
          detail: `${count.length} market(s) on factory`,
        });

        if (count.length > 0) {
          const sample = count[count.length - 1] as Address;
          const deposit = await getPublicClient().readContract({
            address: sample,
            abi: marketAbi,
            functionName: "requiredResolveDeposit",
          });
          checks.push({
            name: "resolve_deposit_sample",
            ok: true,
            detail: `Latest market ${sample} requires ${formatEther(deposit as bigint)} STT to resolve`,
          });
        }
      } catch (e) {
        checks.push({
          name: "factory_code",
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (config.privateKeyConfigured && rpcOk) {
      try {
        const account = getAccountAddress();
        const balance = await getPublicClient().getBalance({ address: account });
        const min = 1_000_000_000_000_000_000n;
        checks.push({
          name: "wallet_balance",
          ok: balance >= min,
          detail: `${account} balance ${formatEther(balance)} STT`,
        });
      } catch (e) {
        checks.push({
          name: "wallet_balance",
          ok: false,
          detail: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const ready = checks.every((c) => c.ok);
    return { ok: true, checks, ready };
  });
}
