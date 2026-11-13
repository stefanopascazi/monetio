// Stored advisor turns turned into what the chat shows (numbers from the engine verdict, not the model).
import type { AdvisorContext } from "./context";
import type { AdvisorVerdict } from "./tools";
import { type VerdictView, verdictView } from "./view";

/** One exchange as the chat renders it. */
export interface AdvisorTurnView {
  /** Log row to rate; null when logging failed. */
  requestId: string | null;
  question: string;
  text: string;
  refused: boolean;
  verdict: VerdictView | null;
  /** Checks a payment plan the user brought: shown with the stronger disclaimer. */
  paymentPlan: boolean;
  rating: 1 | -1 | null;
}

export interface StoredTurn {
  id: string;
  question: string | null;
  answer: string | null;
  verdict: AdvisorVerdict | null;
  refused: boolean;
  payment_plan: boolean;
  rating: number | null;
}

type Names = Pick<AdvisorContext, "accounts" | "categories">;

/** Rows of a conversation as chat turns; failed or purged rows (no text) are left out. */
export function turnViews(rows: StoredTurn[], names: Names): AdvisorTurnView[] {
  return rows
    .filter((r): r is StoredTurn & { question: string; answer: string } => Boolean(r.question && r.answer))
    .map((r) => ({
      requestId: r.id,
      question: r.question,
      text: r.answer,
      refused: r.refused,
      verdict: r.verdict ? verdictView(r.verdict, names) : null,
      paymentPlan: r.payment_plan,
      rating: r.rating === 1 || r.rating === -1 ? r.rating : null,
    }));
}
