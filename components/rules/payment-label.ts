import { formatMoney } from "@monetio/ui";
import { PAYMENT_LABEL } from "@/lib/domain/fees";
import type { RecurringRule } from "@/lib/domain/types";

/** "Bonifico + 0,65 € spese" for payment rules, null otherwise. */
export function paymentLabel(r: Pick<RecurringRule, "paymentMethod" | "feeCents">): string | null {
  if (!r.paymentMethod) return null;
  return r.feeCents ? `${PAYMENT_LABEL[r.paymentMethod]} + ${formatMoney(r.feeCents)} spese` : PAYMENT_LABEL[r.paymentMethod];
}
