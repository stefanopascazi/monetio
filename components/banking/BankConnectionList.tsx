"use client";

import { Landmark, Unlink } from "lucide-react";
import { Badge, Card, InlineConfirm, type SelectOption } from "@monetio/ui";
import { removeBankConnection } from "@/app/actions/bank-links";
import { useToastAction } from "@/hooks/useToastAction";
import type { CategoryOption } from "@/components/import/import-view";
import { awaitsPreview, type BankConnection, consentDaysLeft } from "@/lib/banking/connections";
import { BankAccountLinkSelect } from "./BankAccountLinkSelect";
import { BankAccountStatus } from "./BankAccountStatus";
import { BankSyncPreview } from "./BankSyncPreview";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

/** Consents given at banks, with the accounts each one covers and the MonetIO account each feeds. */
export function BankConnectionList({
  connections,
  accountOptions,
  balances = {},
  lastBookedOn = {},
  categories,
  today,
  now = new Date(),
}: {
  connections: BankConnection[];
  accountOptions: SelectOption[];
  /** MonetIO balance by account id, for the comparison with the bank's. */
  balances?: Record<string, number>;
  /** Latest recorded movement by account id: default start of a first-sync preview. */
  lastBookedOn?: Record<string, string>;
  /** Active categories, for new movements in a first-sync preview. */
  categories?: CategoryOption[];
  /** Today in Rome (ISO), computed at request time by the server page. */
  today: string;
  now?: Date;
}) {
  const { run } = useToastAction();
  if (!connections.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {connections.map((c) => {
        const days = consentDaysLeft(c.validUntil, now);
        const expired = c.status !== "active" || days === 0;
        return (
          <Card
            key={c.id}
            title={c.bankName}
            subtitle={
              expired ? "Consenso scaduto: collega di nuovo la banca" : `Consenso valido fino al ${dateFormat.format(new Date(c.validUntil))} (${days} giorni)`
            }
            action={
              expired ? <Badge tone="danger">Scaduto</Badge> : days <= 14 ? <Badge tone="warning">In scadenza</Badge> : <Badge tone="success">Attivo</Badge>
            }
          >
            <div className="flex flex-col gap-4">
              {c.accounts.length ? (
                <ul className="flex flex-col gap-2">
                  {c.accounts.map((a) => (
                    <li key={a.id} className="flex flex-col gap-3 rounded-[14px] bg-surface-raised p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Landmark className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{a.name ?? "Conto"}</span>
                        {a.ibanMasked && <span className="shrink-0 font-mono text-xs text-ink-muted">{a.ibanMasked}</span>}
                      </div>
                      <BankAccountLinkSelect bankAccountId={a.id} accountId={a.accountId} options={accountOptions} />
                      {a.accountId &&
                        (awaitsPreview(a) && !expired ? (
                          <BankSyncPreview key={a.accountId} bankAccountId={a.id} defaultFrom={lastBookedOn[a.accountId] ?? today} today={today} categories={categories} />
                        ) : (
                          <BankAccountStatus account={a} monetioBalanceCents={balances[a.accountId]} now={now} />
                        ))}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">La banca non ha condiviso nessun conto.</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <InlineConfirm
                  triggerLabel="Scollega"
                  triggerIcon={<Unlink />}
                  message="Revoco il consenso alla banca e tolgo questi conti da MonetIO? I movimenti già registrati restano."
                  confirmLabel="Scollega"
                  onConfirm={() => run(() => removeBankConnection(c.id))}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
