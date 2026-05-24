export function emit(result: Record<string, unknown>, human?: string) {
  const jsonMode =
    process.env.VERDICT_JSON === "1" ||
    process.argv.includes("--json") ||
    !process.stdout.isTTY;

  if (jsonMode) {
    console.log(JSON.stringify(result, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    if (result.ok === false) process.exitCode = 1;
    return;
  }

  if (human) {
    console.log(human);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  if (result.ok === false) process.exitCode = 1;
}

export function emitError(message: string) {
  emit({ ok: false, error: message });
}
