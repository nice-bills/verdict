const YES_NO_INVALID = /\b(YES|NO|INVALID)\b/i;

export type CreateMarketInput = {
  question: string;
  sourceUrl: string;
  resolvePrompt: string;
  deadlineUnix: number;
};

export function validateCreateMarketInput(input: CreateMarketInput): string | null {
  const question = input.question.trim();
  if (question.length < 8) {
    return "Question must be at least 8 characters";
  }

  let url: URL;
  try {
    url = new URL(input.sourceUrl.trim());
  } catch {
    return "sourceUrl must be a valid http(s) URL";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "sourceUrl must use http or https";
  }

  const rule = input.resolvePrompt.trim();
  if (rule.length < 12) {
    return "Resolution rule must be at least 12 characters";
  }
  if (!YES_NO_INVALID.test(rule)) {
    return "Resolution rule should mention YES, NO, and/or INVALID outcomes";
  }

  const now = Math.floor(Date.now() / 1000);
  if (input.deadlineUnix <= now + 60) {
    return "Deadline must be at least 60 seconds in the future";
  }
  if (input.deadlineUnix > now + 365 * 24 * 3600) {
    return "Deadline must be within one year";
  }

  return null;
}
