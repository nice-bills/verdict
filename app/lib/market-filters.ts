/** On-chain smoke tests from operator/e2e — hide from product UI. */
const LEGACY_QUESTION = /^does the (demo )?page contain verdict\?$/i;

export function isLegacySmokeMarket(question: string): boolean {
  const q = question.trim();
  if (LEGACY_QUESTION.test(q)) return true;
  if (/contain verdict/i.test(q) && /example\.com|raw\.githubusercontent/i.test(q)) {
    return true;
  }
  return false;
}

export function filterDisplayMarkets<T extends { question: string }>(markets: T[]): T[] {
  return markets.filter((m) => !isLegacySmokeMarket(m.question));
}
