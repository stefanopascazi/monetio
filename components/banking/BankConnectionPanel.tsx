"use client";

import { Unlink } from "lucide-react";
import { Badge, Card, InlineConfirm, type SelectOption } from "@monetio/ui";
import { removeBankConnection } from "@/app/actions/bank-links";
import { useToastAction } from "@/hooks/useToastAction";
import type { CategoryOption } from "@/components/import/import-view";
import { type BankConnection, consentDaysLeft, isConsentExpired } from "@/lib/banking/connections";
import type { BankSyncBatch } from "@/lib/banking/sync-batches";
import { BankAccountPanel } from "./BankAccountPanel";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

export type BankConnectionPanelProps = {
  connection: BankConnection;
  accountOptions: SelectOption[];
  /** MonetIO balance by account id, for the comparison with the bank's. */
  balances?: Record<string, number>;
  /** Latest recorded movement by account id: default start of a first-sync preview. */
  lastBookedOn?: Record<string, string>;
  /** Latest sync batches by account id, newest first. */
  batches?: Record<string, BankSyncBatch[]>;
  /** Active categories, for new movements in a first-sync preview. */
  categories?: CategoryOption[];
  /** Today in Rome (ISO), computed at request time by the server page. */
  today: string;
  now?: Date;
};

/** One consent given at a bank: its validity, the accounts it covers and how each feeds MonetIO. */
export function BankConnectionPanel({ connection: c, accountOptions, balances = {}, lastBookedOn = {}, batches = {}, categories, today, now = new Date() }: BankConnectionPanelProps) {
  const { run } = useToastAction();
  const days = consentDaysLeft(c.validUntil, now);
  const expired = isConsentExpired(c, now);
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={c.bankName}
        subtitle={expired ? "Consenso scaduto: collega di nuovo la banca" : `Consenso valido fino al ${dateFormat.format(new Date(c.validUntil))} (${days} giorni)`}
        action={expired ? <Badge tone="danger">Scaduto</Badge> : days <= 14 ? <Badge tone="warning">In scadenza</Badge> : <Badge tone="success">Attivo</Badge>}
      >
        <InlineConfirm
          triggerLabel="Scollega"
          triggerIcon={<Unlink />}
          message="Revoco il consenso alla banca e tolgo questi conti da MonetIO? I movimenti già registrati restano."
          confirmLabel="Scollega"
          onConfirm={() => run(() => removeBankConnection(c.id))}
        />
      </Card>
      {c.accounts.length ? (
        c.accounts.map((a) => (
          <BankAccountPanel
            key={a.id}
            account={a}
            expired={expired}
            accountOptions={accountOptions}
            monetioBalanceCents={a.accountId ? balances[a.accountId] : undefined}
            defaultFrom={(a.accountId && lastBookedOn[a.accountId]) || today}
            batches={(a.accountId && batches[a.accountId]) || []}
            categories={categories}
            today={today}
            now={now}
          />
        ))
      ) : (
        <p className="text-sm text-ink-muted">La banca non ha condiviso nessun conto.</p>
      )}
    </div>
  );
}
