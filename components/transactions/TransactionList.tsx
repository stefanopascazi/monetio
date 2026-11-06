"use client";

import { useState } from "react";
import { Accordion, Amount, EmptyState } from "@monetio/ui";
import { Receipt } from "lucide-react";
import type { NamedRef } from "@/components/common/options";
import type { TxnView } from "@/lib/data/views";
import { TransactionDetails } from "./TransactionDetails";
import { TransactionTitle } from "./TransactionTitle";

export interface TransactionListProps {
  items: TxnView[];
  accounts: NamedRef[];
  categories: NamedRef[];
  showAccount?: boolean;
  /** Shows the running balance under the amount (statement mode). */
  showBalance?: boolean;
  emptyTitle?: string;
}

/** Transactions as an accordion; details and edit form render only for open rows. */
export function TransactionList({ items, accounts, categories, showAccount = true, showBalance, emptyTitle = "Nessun movimento" }: TransactionListProps) {
  const [open, setOpen] = useState<string[]>([]);
  if (!items.length) return <EmptyState icon={<Receipt />} title={emptyTitle} description="Prova a cambiare periodo o filtri." />;
  return (
    <Accordion
      type="single"
      value={open}
      onValueChange={setOpen}
      items={items.map((t) => ({
        id: t.id,
        title: <TransactionTitle t={t} showAccount={showAccount} />,
        meta: (
          <span className="flex flex-col items-end">
            <Amount cents={t.amountCents} tone={t.isTransfer ? "transfer" : t.kind === "adjustment" ? "neutral" : "auto"} showSign />
            {showBalance && t.balanceAfterCents !== undefined && (
              <span className="text-xs text-ink-subtle">
                Saldo <Amount cents={t.balanceAfterCents} tone="neutral" size="sm" />
              </span>
            )}
          </span>
        ),
        content: open.includes(t.id) ? <TransactionDetails t={t} accounts={accounts} categories={categories} onDone={() => setOpen([])} /> : null,
      }))}
    />
  );
}
