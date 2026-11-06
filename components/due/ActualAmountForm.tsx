"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AmountInput, Button, TextField } from "@monetio/ui";
import { clearOccurrenceAmount, setOccurrenceAmount } from "@/app/actions/overrides";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
import { useToastAction } from "@/hooks/useToastAction";
import type { DueView } from "./DueList";

/** Actual amount and due date of one occurrence (e.g. the bill arrived), without paying it. */
export function ActualAmountForm({ entry, onClose }: { entry: DueView; onClose: () => void }) {
  const [amount, setAmount] = useState<number | null>(Math.abs(entry.amountCents));
  const { state, pending, onSubmit, error } = useFormAction(setOccurrenceAmount.bind(null, entry.key), onClose);
  const { pending: clearing, run } = useToastAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className="mx-4 mb-4 grid grid-cols-1 gap-3 rounded-[22px] bg-surface-raised p-4 sm:grid-cols-2"
    >
      <FormMessage state={state} />
      <input type="hidden" name="amountCents" value={amount ?? ""} />
      <AmountInput label="Importo da pagare" kind={entry.amountCents >= 0 ? "income" : "expense"} valueCents={amount} onValueChange={setAmount} error={error("amountCents")} />
      <TextField name="dueDate" type="date" label="Scadenza" defaultValue={entry.date} error={error("dueDate")} required />
      <TextField name="note" label="Note" optional placeholder="Es. bolletta n. 123, periodo set-ott" defaultValue={entry.note ?? ""} className="sm:col-span-2" />
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" loading={pending} disabled={!amount}>
          Salva importo
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Annulla
        </Button>
        {entry.confirmed && (
          <Button
            type="button"
            variant="ghost"
            iconStart={<Trash2 />}
            loading={clearing}
            onClick={() => run(() => clearOccurrenceAmount(entry.key), onClose)}
          >
            Torna alla stima
          </Button>
        )}
      </div>
    </form>
  );
}
