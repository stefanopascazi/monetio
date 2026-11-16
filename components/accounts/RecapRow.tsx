"use client";

import { Check, Pencil } from "lucide-react";
import { useState } from "react";
import { Accordion, Amount, Button } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { ActualAmountForm } from "@/components/due/ActualAmountForm";
import { PayEntryForm } from "@/components/due/PayEntryForm";
import { TransactionDetails } from "@/components/transactions/TransactionDetails";
import type { TxnView } from "@/lib/data/views";
import type { RecapItem } from "@/lib/domain/month-recap";
import { EstimateActions } from "./EstimateActions";
import { EstimateUsageList } from "./EstimateUsageList";
import { originHref, originTag, originText, type RecapRule } from "./recap-origin";
import { RecapOrigin } from "./RecapOrigin";
import { isUsedUp } from "./recap-source";
import { RecapItemSummary } from "./RecapItemSummary";

/** What the recap needs to explain and act on its rows. */
export interface RecapEditing {
  /** Planned transactions of the account by id. */
  planned: Record<string, TxnView>;
  /** Rules and contributions by id. */
  rules: Record<string, RecapRule>;
  accounts: NamedRef[];
  categories: NamedRef[];
}

export interface RecapRowProps {
  item: RecapItem;
  /** Today's date, only in the current month: enables booking from the row. */
  today?: string;
  editing?: RecapEditing;
}

type Mode = "pay" | "amount" | null;

/** Origin, then the actions that fit the row: book, correct the occurrence, edit a planned movement. */
function RowPanel({ item, today, editing, close }: RecapRowProps & { close: () => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const rule = item.ruleId ? editing?.rules[item.ruleId] : undefined;
  const planned = item.txnId ? editing?.planned[item.txnId] : undefined;
  const origin = (
    <div className="px-4">
      <RecapOrigin
        text={originText(item, rule, planned?.createdByName)}
        href={rule ? originHref(rule) : undefined}
        note={item.occurrence?.note}
        confirmed={item.occurrence?.confirmed}
      />
    </div>
  );

  if (planned && editing) {
    return (
      <div className="flex flex-col gap-3">
        {origin}
        <TransactionDetails t={planned} accounts={editing.accounts} categories={editing.categories} onDone={close} />
      </div>
    );
  }

  if (item.source === "estimate") {
    const estimateRef = today && !isUsedUp(item) ? item.ref : undefined;
    return (
      <div className="flex flex-col gap-3 px-4 pb-2">
        <RecapOrigin text={originText(item, rule)} href={rule ? originHref(rule) : undefined} />
        {item.usage && <EstimateUsageList usage={item.usage} />}
        {estimateRef && today && <EstimateActions refKey={estimateRef} amountCents={item.amountCents} today={today} />}
      </div>
    );
  }

  // Due rules and contributions are booked by hand; auto rules book themselves on their date.
  const payable = Boolean(today && item.ref && rule && (rule.type === "contribution" || rule.schedule === "due"));
  const correctable = Boolean(item.source === "rule" && item.ref && item.occurrence);
  const ref = item.ref ?? "";
  return (
    <div className="flex flex-col gap-3 pb-2">
      {origin}
      {mode === null && (payable || correctable) && (
        <div className="flex flex-wrap gap-2 px-4">
          {payable && (
            <Button variant="secondary" size="sm" iconStart={<Check />} onClick={() => setMode("pay")}>
              Registra pagamento
            </Button>
          )}
          {correctable && (
            <Button variant="ghost" size="sm" iconStart={<Pencil />} onClick={() => setMode("amount")}>
              Correggi importo o data
            </Button>
          )}
        </div>
      )}
      {mode === "pay" && rule && today && (
        <PayEntryForm
          entry={{ key: ref, amountCents: item.amountCents, canConfirm: rule.type === "rule", kind: rule.kind, paymentMethod: rule.paymentMethod, feeCents: rule.feeCents }}
          today={today}
          onClose={close}
        />
      )}
      {mode === "amount" && item.occurrence && (
        <ActualAmountForm
          entry={{ key: ref, amountCents: item.amountCents, date: item.occurrence.dueDate, note: item.occurrence.note, confirmed: item.occurrence.confirmed }}
          hint={
            rule?.schedule === "auto"
              ? "Aggiorna importo o data di questa occorrenza: con la data di oggi o passata si registra subito."
              : "Aggiorna importo o scadenza previsti (es. è arrivata la bolletta). Non registra il pagamento: per quello usa «Registra pagamento»."
          }
          onClose={() => setMode(null)}
        />
      )}
    </div>
  );
}

/** One row of "Da contabilizzare": opens on where it comes from and what can be done with it. */
export function RecapRow({ item, today, editing }: RecapRowProps) {
  const [open, setOpen] = useState<string[]>([]);
  const rule = item.ruleId ? editing?.rules[item.ruleId] : undefined;
  return (
    <li className="px-1 py-1">
      <Accordion
        type="single"
        value={open}
        onValueChange={setOpen}
        items={[
          {
            id: item.key,
            title: <RecapItemSummary item={item} tag={originTag(item, rule)} />,
            meta: <Amount cents={item.amountCents} size="sm" showSign />,
            content: open.length ? <RowPanel item={item} today={today} editing={editing} close={() => setOpen([])} /> : null,
          },
        ]}
      />
    </li>
  );
}
