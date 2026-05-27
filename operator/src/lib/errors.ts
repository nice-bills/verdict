import { BaseError, ContractFunctionRevertedError } from "viem";

export function formatActionError(e: unknown): string {
  if (e instanceof Error && e.message) {
    if (e instanceof BaseError) {
      const revert = e.walk((err) => err instanceof ContractFunctionRevertedError);
      if (revert instanceof ContractFunctionRevertedError) {
        const name = revert.data?.errorName ?? "ContractReverted";
        const args = revert.data?.args;
        if (args?.length) {
          return `${name}: ${args.map(String).join(", ")}`;
        }
        return name;
      }
      return e.shortMessage || e.message;
    }
    return e.message;
  }
  return String(e);
}

export async function runAction<T extends Record<string, unknown>>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, error: formatActionError(e) } as unknown as T;
  }
}
