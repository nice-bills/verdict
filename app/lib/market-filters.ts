/** On-chain smoke tests from operator/e2e — never show in product UI. */
export function isLegacySmokeMarket(question: string): boolean {
  const q = question.trim();
  if (/contain\s+verdict/i.test(q)) return true;
  if (/demo page contain/i.test(q)) return true;
  return false;
}

export function filterDisplayMarkets<T extends { question: string }>(markets: T[]): T[] {
  return markets.filter((m) => !isLegacySmokeMarket(m.question));
}
