/** Demo-friendly example — user opts in via "Use demo example". */
export const DEMO_MARKET = {
  question: "Will Shannon testnet exceed 2 million transactions by June 2026?",
  sourceUrl: "https://somnia-testnet.blockscout.com",
  resolvePrompt:
    "Use Blockscout network stats. Return YES if total transactions exceed 2,000,000, else NO. Return INVALID if stats are unavailable.",
  deadlineMinutes: "5",
} as const;
