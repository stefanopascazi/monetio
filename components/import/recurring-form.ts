// Turns a recurring proposal into the FormData the rule Server Action already validates.
import type { RecurringProposal } from "@/lib/import/recurring";

/**
 * A "due" rule starting after the last seen occurrence: it shows up in Scadenze and projections
 * without booking anything automatically, so it never duplicates the imported movements.
 */
export function ruleFormData(accountId: string, p: Pick<RecurringProposal, "description" | "amountCents" | "frequency" | "dayOfMonth" | "startDate" | "categoryId">): FormData {
  const fd = new FormData();
  fd.set("kind", p.amountCents > 0 ? "income" : "expense");
  fd.set("accountId", accountId);
  fd.set("amountCents", String(Math.abs(p.amountCents)));
  fd.set("frequency", p.frequency);
  fd.set("schedule", "due");
  fd.set("dayOfMonth", String(p.dayOfMonth));
  fd.set("startDate", p.startDate);
  fd.set("description", p.description.slice(0, 120));
  fd.set("categoryId", p.categoryId ?? "");
  return fd;
}
