// Movement kinds shown by transaction and rule forms (bonifico/CBill are expenses with a fee).
import type { SegmentedOption } from "@monetio/ui";
import type { MovementFormKind } from "@/lib/forms/payment";

export const MOVEMENT_KIND_OPTIONS: SegmentedOption<MovementFormKind>[] = [
  { value: "expense", label: "Uscita", tone: "expense" },
  { value: "income", label: "Entrata", tone: "income" },
  { value: "transfer", label: "Giroconto", tone: "transfer" },
  { value: "bank_transfer", label: "Bonifico", tone: "expense" },
  { value: "cbill", label: "CBill", tone: "expense" },
];

export const isPaymentKind = (k: MovementFormKind) => k === "bank_transfer" || k === "cbill";

/** Sign shown by amount inputs for a form kind. */
export const amountKind = (k: MovementFormKind): "expense" | "income" | "transfer" => (isPaymentKind(k) ? "expense" : (k as "expense" | "income" | "transfer"));
