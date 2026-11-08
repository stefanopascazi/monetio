import { Amount } from "@monetio/ui";

/** "Rimanenza a fine mese" line on an account card. Renders nothing when unknown. */
export function MonthEndNote({ cents }: { cents?: number }) {
  if (cents === undefined) return null;
  return (
    <span className="flex items-center justify-between gap-2 text-sm">
      <span className="text-ink-muted">Rimanenza a fine mese</span>
      <Amount cents={cents} tone={cents < 0 ? "expense" : "neutral"} size="sm" />
    </span>
  );
}
