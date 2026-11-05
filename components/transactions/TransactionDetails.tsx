"use client";

import { Check, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert, Button, InlineConfirm } from "@monetio/ui";
import { confirmPlanned, deleteTransaction, updateTransaction } from "@/app/actions/transactions";
import type { ActionState } from "@/app/actions/state";
import type { NamedRef } from "@/components/common/options";
import { SOURCE_LABEL, type TxnView } from "@/lib/data/views";
import { TransactionForm } from "./TransactionForm";

/** Expanded body of a transaction: notes, edit form, delete. */
export function TransactionDetails({ t, accounts, categories }: { t: TxnView; accounts: NamedRef[]; categories: NamedRef[] }) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  const editable = t.kind !== "adjustment";
  const run = (fn: () => Promise<ActionState>) => start(async () => setResult(await fn()));

  return (
    <div className="flex flex-col gap-4 pb-2">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-ink-muted">Origine: </dt>
          <dd className="inline">{SOURCE_LABEL[t.source]}</dd>
        </div>
        {t.notes && (
          <div className="sm:col-span-2">
            <dt className="text-ink-muted">Note</dt>
            <dd className="whitespace-pre-line">{t.notes}</dd>
          </div>
        )}
      </dl>
      {result?.message && <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert>}
      {t.status === "planned" && (
        <Button variant="secondary" size="sm" iconStart={<Check />} loading={pending} onClick={() => run(() => confirmPlanned(t.id))} className="w-fit">
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
          defaults={{
            kind: t.isTransfer ? "transfer" : t.amountCents >= 0 ? "income" : "expense",
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
        message={t.isTransfer ? "Elimino il giroconto su entrambi i conti? Resterà nello storico modifiche." : "Elimino il movimento? Resterà nello storico modifiche."}
        confirmLabel="Elimina"
        onConfirm={() => run(() => deleteTransaction(t.id))}
      />
    </div>
  );
}
