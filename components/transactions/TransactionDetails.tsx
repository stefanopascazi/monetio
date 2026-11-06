"use client";

import { Check, Trash2 } from "lucide-react";
import { Button, InlineConfirm } from "@monetio/ui";
import { confirmPlanned, deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import type { NamedRef } from "@/components/common/options";
import { useToastAction } from "@/hooks/useToastAction";
import { SOURCE_LABEL, type TxnView } from "@/lib/data/views";
import { TransactionForm } from "./TransactionForm";

/** Expanded body of a transaction: notes, edit form, delete. `onDone` closes the row after a change. */
export function TransactionDetails({ t, accounts, categories, onDone }: { t: TxnView; accounts: NamedRef[]; categories: NamedRef[]; onDone?: () => void }) {
  const { pending, run } = useToastAction();
  const editable = t.kind !== "adjustment";

  return (
    <div className="flex flex-col gap-4 pb-2">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-ink-muted">Origine: </dt>
          <dd className="inline">{SOURCE_LABEL[t.source]}</dd>
        </div>
        {t.createdByName && (
          <div>
            <dt className="inline text-ink-muted">Inserito da: </dt>
            <dd className="inline">{t.createdByName}</dd>
          </div>
        )}
        {t.notes && (
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Note</dt>
            <dd className="whitespace-pre-line">{t.notes}</dd>
          </div>
        )}
      </dl>
      {t.status === "planned" && (
        <Button variant="secondary" size="sm" iconStart={<Check />} loading={pending} onClick={() => run(() => confirmPlanned(t.id), onDone)} className="w-fit">
          Registra come avvenuto
        </Button>
      )}
      {editable && (
        <TransactionForm
          embedded
          lockKind={t.isTransfer}
          title="Modifica"
          submitLabel="Salva modifiche"
          action={updateTransaction.bind(null, t.id)}
          accounts={accounts}
          categories={categories}
          onSaved={onDone}
          defaults={{
            kind: t.isTransfer ? "transfer" : (t.paymentMethod ?? (t.amountCents >= 0 ? "income" : "expense")),
            accountId: t.accountId,
            counterpartAccountId: t.counterpartAccountId,
            categoryId: t.categoryId,
            amountCents: Math.abs(t.amountCents),
            bookedOn: t.bookedOn,
            description: t.description,
            notes: t.notes,
            planned: t.status === "planned",
          }}
        />
      )}
      <InlineConfirm
        triggerLabel="Elimina movimento"
        triggerIcon={<Trash2 />}
        message={
          t.isTransfer
            ? "Elimino il giroconto su entrambi i conti? Resterà nello storico modifiche."
            : t.paymentMethod
              ? "Elimino il movimento e le sue eventuali spese? Resterà nello storico modifiche."
              : "Elimino il movimento? Resterà nello storico modifiche."
        }
        confirmLabel="Elimina"
        onConfirm={() => run(() => deleteTransaction(t.id), onDone)}
      />
    </div>
  );
}
