import { isAddress, type Address } from "viem";

export function parseMarketAddress(raw: string): Address {
  const trimmed = raw.trim();
  if (!isAddress(trimmed, { strict: false })) {
    throw new Error(`Invalid market address: ${raw}`);
  }
  return trimmed as Address;
}

export function parseFactoryAddress(raw: string): Address {
  const trimmed = raw.trim();
  if (!isAddress(trimmed, { strict: false })) {
    throw new Error(`Invalid factory address: ${raw}`);
  }
  return trimmed as Address;
}

export function parsePositiveInt(
  raw: string | number | undefined,
  name: string,
  fallback: number
): number {
  if (raw === undefined || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return Math.floor(n);
}

export function parseAmountStt(raw: string | undefined, fallback = "0.01"): string {
  const s = (raw ?? fallback).trim();
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid amount: ${raw}`);
  }
  return s;
}
