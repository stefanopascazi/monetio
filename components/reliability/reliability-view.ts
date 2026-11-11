// Reliability shown next to a projection series: the household's for all accounts, the account's otherwise.
import type { Reliability, ReliabilityLevel, ReliabilitySuggestion } from "@/lib/domain/reliability";

export type ReliabilityData = Pick<Reliability, "score" | "level" | "accounts" | "suggestions">;

export function reliabilityFor(data: ReliabilityData, seriesId: string): { level: ReliabilityLevel; score: number; suggestions: ReliabilitySuggestion[] } {
  const account = data.accounts.find((a) => a.accountId === seriesId);
  if (!account) return { level: data.level, score: data.score, suggestions: data.suggestions };
  return { level: account.level, score: account.score, suggestions: data.suggestions.filter((s) => s.accountId === seriesId) };
}
