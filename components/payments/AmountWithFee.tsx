import { Amount } from "@monetio/ui";
import { feeBreakdown } from "./fee-breakdown";

/** Signed amount including the bonifico/CBill fee, with the split shown just below. */
export function AmountWithFee({ cents, feeCents, tone = "auto" }: { cents: number; feeCents?: number | null; tone?: "auto" | "transfer" }) {
  const { totalCents, label } = feeBreakdown(cents, feeCents);
  return (
    <span className="flex flex-col items-end">
      <Amount cents={totalCents} tone={tone} showSign />
      {label && <span className="whitespace-nowrap text-xs font-normal text-ink-muted">{label}</span>}
    </span>
  );
}
