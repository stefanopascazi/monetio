import { loadReliability } from "@/lib/data/reliability";
import { ReliabilityCard } from "./ReliabilityCard";

/** Streams the reliability card once the score is computed. */
export async function ReliabilitySection({ maxSuggestions, showAccounts }: { maxSuggestions?: number; showAccounts?: boolean }) {
  const reliability = await loadReliability();
  return <ReliabilityCard reliability={reliability} maxSuggestions={maxSuggestions} showAccounts={showAccounts} />;
}
