// "Da rivedere" queue: bank movements the sync could not settle on its own.

export type BankReviewReason = "amount_differs" | "possible_duplicate" | "ambiguous";
export type BankReviewAction = "added" | "matched" | "ignored";

export type BankReviewCandidate = { id: string; bookedOn: string; amountCents: number; description: string };

export type BankReview = {
  id: string;
  accountId: string;
  accountName: string;
  bookedOn: string;
  amountCents: number;
  description: string;
  reason: BankReviewReason;
  candidate: BankReviewCandidate | null;
};

type Row = {
  id: string;
  account_id: string;
  booked_on: string;
  amount_cents: number | string;
  description: string;
  reason: string;
  account: { name: string } | null;
  candidate: { id: string; booked_on: string; amount_cents: number | string; description: string } | null;
};

const REASONS: BankReviewReason[] = ["amount_differs", "possible_duplicate", "ambiguous"];

export function mapBankReview(row: Row): BankReview {
  const c = row.candidate;
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account?.name ?? "Conto",
    bookedOn: row.booked_on,
    amountCents: Number(row.amount_cents),
    description: row.description,
    reason: REASONS.includes(row.reason as BankReviewReason) ? (row.reason as BankReviewReason) : "ambiguous",
    candidate: c ? { id: c.id, bookedOn: c.booked_on, amountCents: Number(c.amount_cents), description: c.description } : null,
  };
}

export const REVIEW_REASON_LABEL: Record<BankReviewReason, string> = {
  amount_differs: "Importo diverso dal previsto",
  possible_duplicate: "Possibile doppione",
  ambiguous: "Più movimenti simili",
};

/** "È lo stesso" needs a candidate to merge into. */
export function reviewActions(review: Pick<BankReview, "candidate">): BankReviewAction[] {
  return review.candidate ? ["matched", "added", "ignored"] : ["added", "ignored"];
}

export function isReviewAction(value: string): value is BankReviewAction {
  return value === "added" || value === "matched" || value === "ignored";
}

export const REVIEW_DONE_MESSAGE: Record<BankReviewAction, string> = {
  added: "Movimento aggiunto.",
  matched: "Movimento abbinato con i dati della banca.",
  ignored: "Movimento ignorato.",
};
