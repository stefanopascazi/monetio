"use client";

import { useState } from "react";
import { AmountInput, Button, TextField } from "@monetio/ui";
import { bookEstimate } from "@/app/actions/estimates";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";

export interface EstimateBookFormProps {
  /** Occurrence key of the estimate. */
  refKey: string;
  /** Signed remainder, offered as the default amount. */
  amountCents: number;
  today: string;
  onClose: () => void;
}

/** Inline form that books an estimate remainder as a movement, amount editable. */
export function EstimateBookForm({ refKey, amountCents, today, onClose }: EstimateBookFormProps) {
  const [amount, setAmount] = useState<number | null>(Math.abs(amountCents));
  const { state, pending, onSubmit, error } = useFormAction(bookEstimate.bind(null, refKey), onClose);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className="grid grid-cols-1 gap-3 rounded-[22px] bg-surface-raised p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <FormMessage state={state} />
      <input type="hidden" name="amountCents" value={amount ?? ""} />
      <AmountInput label="Importo effettivo" kind={amountCents >= 0 ? "income" : "expense"} valueCents={amount} onValueChange={setAmount} error={error("amountCents")} />
      <TextField name="bookedOn" type="date" label="Data" defaultValue={today} max={today} error={error("bookedOn")} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        <Button type="submit" loading={pending} disabled={!amount}>
          Registra
        </Button>
      </div>
    </form>
  );
}
