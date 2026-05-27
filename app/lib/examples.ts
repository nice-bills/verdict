/** Example market for demos — not loaded by default; user opts in via "Try an example". */
export const EXAMPLE_MARKET = {
  question: "Will Shannon testnet process more than 1M transactions in May 2026?",
  sourceUrl: "https://somnia-testnet.blockscout.com",
  resolvePrompt:
    "Read the Blockscout stats page. Return YES if total transactions for May 2026 exceed 1,000,000, else NO. Return INVALID if the page cannot be read.",
  deadlineMinutes: "60",
} as const;
