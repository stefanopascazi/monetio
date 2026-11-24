"use client";

import { Card } from "@monetio/ui";
import type { CategoryOption } from "@/components/import/import-view";
import { awaitsPreview, type BankConnectionAccount } from "@/lib/banking/connections";
import type { BankSyncBatch } from "@/lib/banking/sync-batches";
import { BankAccountStatus } from "./BankAccountStatus";
import { BankSyncHistory } from "./BankSyncHistory";
import { BankSyncPreview } from "./BankSyncPreview";

type Props = {
  account: BankConnectionAccount;
  /** Consent no longer valid: no preview, status only. */
  expired: boolean;
  /** Card title; defaults to the bank account name. */
  title?: string;
  monetioBalanceCents?: number;
  /** Default start of a first-sync preview. */
  defaultFrom: string;
  batches: BankSyncBatch[];
  categories?: CategoryOption[];
  today: string;
  now: Date;
};

/** Bank side of a linked account (its "Banca" tab): first import, balances, sync status and history. */
export function BankAccountPanel({ account: a, expired, title, monetioBalanceCents, defaultFrom, batches, categories, today, now }: Props) {
  return (
    <Card title={title ?? a.name ?? "Conto"} subtitle={a.ibanMasked && <span className="font-mono">{a.ibanMasked}</span>} tone="raised">
      <div className="flex flex-col gap-4 text-sm">
        {a.accountId &&
          (awaitsPreview(a) && !expired ? (
            <BankSyncPreview key={a.accountId} bankAccountId={a.id} defaultFrom={defaultFrom} today={today} categories={categories} />
          ) : (
            <BankAccountStatus account={a} monetioBalanceCents={monetioBalanceCents} now={now} />
          ))}
        {a.accountId && <BankSyncHistory batches={batches} />}
      </div>
    </Card>
  );
}
