import { formatMoney } from "@monetio/ui";

export interface FeeBreakdown {
  /** Signed total: payment plus fee. */
  totalCents: number;
  /** "46,33 € + 1,00 € spese", null without a fee. */
  label: string | null;
}

/**
 * Total of a bonifico/CBill/transfer (signed amount + positive fee) and its breakdown label.
 * The fee is paid by the outgoing side: incoming amounts (a transfer seen from the receiving
 * account) stay unchanged.
 */
export function feeBreakdown(amountCents: number, feeCents: number | null | undefined): FeeBreakdown {
  if (!feeCents || amountCents > 0) return { totalCents: amountCents, label: null };
  return {
    totalCents: amountCents - feeCents,
    label: `${formatMoney(Math.abs(amountCents))} + ${formatMoney(feeCents)} spese`,
  };
}
