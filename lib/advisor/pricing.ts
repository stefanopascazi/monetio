// Estimated cost of advisor calls, to measure what the experiment really costs (USD, list prices per million tokens).

export interface AdvisorUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

interface Price {
  input: number;
  output: number;
  cacheRead: number;
  /** 5-minute cache writes: 1.25x input. */
  cacheWrite: number;
}

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
};

export const EMPTY_USAGE: AdvisorUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function addUsage(a: AdvisorUsage, b: AdvisorUsage): AdvisorUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** Cost in millionths of a dollar (tokens x price per million tokens); null for a model without a known price. */
export function costMicroUsd(model: string, u: AdvisorUsage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return Math.round(u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite);
}
