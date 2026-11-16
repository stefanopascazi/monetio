"use client";

import { useState } from "react";
import { Accordion, Amount } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { ActualAmountForm } from "@/components/due/ActualAmountForm";
import { TransactionDetails } from "@/components/transactions/TransactionDetails";
import type { TxnView } from "@/lib/data/views";
import type { RecapItem } from "@/lib/domain/month-recap";
import { EstimateActions } from "./EstimateActions";
import { EstimateUsageRow } from "./EstimateUsageRow";
import { isUsedUp } from "./recap-source";
import { RecapItemSummary } from "./RecapItemSummary";

/** What the recap needs to edit planned movements in place. */
export interface RecapEditing {
  /** Planned transactions of the account by id. */
  planned: Record<string, TxnView>;
  accounts: NamedRef[];
  categories: NamedRef[];
}

export interface RecapRowProps {
  item: RecapItem;
  /** Today's date in the current month: enables booking or dropping estimates. */
  today?: string;
  editing?: RecapEditing;
}

/** Edit panel of an item: a planned movement or a rule occurrence; null when it cannot be edited here. */
function editor(item: RecapItem, editing: RecapEditing | undefined, close: () => void) {
  const planned = item.txnId ? editing?.planned[item.txnId] : undefined;
  if (planned && editing) return <TransactionDetails t={planned} accounts={editing.accounts} categories={editing.categories} onDone={close} />;
  if (item.source === "rule" && item.ref && item.occurrence) {
    const { dueDate, confirmed, note } = item.occurrence;
    return <ActualAmountForm entry={{ key: item.ref, amountCents: item.amountCents, date: dueDate, note, confirmed }} onClose={close} />;
  }
  return null;
}

/** One row of "Da contabilizzare": opens to edit or delete it, estimates keep their own actions. */
export function RecapRow({ item, today, editing }: RecapRowProps) {
  const [open, setOpen] = useState<string[]>([]);
  // Estimates of the current month: book the remainder or drop it (nothing left once used up).
  const estimateRef = today && item.source === "estimate" && !isUsedUp(item) ? item.ref : undefined;
  if (item.usage) {
    return (
      <li className="flex flex-col gap-2 px-1 py-1">
        <EstimateUsageRow item={{ ...item, usage: item.usage }} />
        {estimateRef && today && (
          <div className="px-4 pb-2">
            <EstimateActions refKey={estimateRef} amountCents={item.amountCents} today={today} />
          </div>
        )}
      </li>
    );
  }
  const close = () => setOpen([]);
  const content = editor(item, editing, close);
  if (content) {
    return (
      <li className="px-1 py-1">
        <Accordion
          type="single"
          value={open}
          onValueChange={setOpen}
          items={[{ id: item.key, title: <RecapItemSummary item={item} />, meta: <Amount cents={item.amountCents} size="sm" showSign />, content: open.length ? content : null }]}
        />
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <RecapItemSummary item={item} />
        <Amount cents={item.amountCents} size="sm" showSign />
      </div>
      {estimateRef && today && <EstimateActions refKey={estimateRef} amountCents={item.amountCents} today={today} />}
    </li>
  );
}
