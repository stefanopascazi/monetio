"use client";

import Link from "next/link";
import { Unlink } from "lucide-react";
import { Badge, Card, InlineConfirm, type SelectOption } from "@monetio/ui";
import { removeBankConnection } from "@/app/actions/bank-links";
import { useToastAction } from "@/hooks/useToastAction";
import { awaitsPreview, type BankConnection, consentDaysLeft, isConsentExpired } from "@/lib/banking/connections";
import { BankAccountLinkSelect } from "./BankAccountLinkSelect";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

export type BankConnectionPanelProps = {
  connection: BankConnection;
  accountOptions: SelectOption[];
  now?: Date;
};

/**
 * One consent given at a bank: its validity, the accounts it shares and the MonetIO account each feeds.
 * Movements, balances and history live on the account page ("Banca" tab).
 */
export function BankConnectionPanel({ connection: c, accountOptions, now = new Date() }: BankConnectionPanelProps) {
  const { run } = useToastAction();
  const days = consentDaysLeft(c.validUntil, now);
  const expired = isConsentExpired(c, now);
  return (
    <Card
      title={c.bankName}
      subtitle={expired ? "Consenso scaduto: collega di nuovo la banca" : `Consenso valido fino al ${dateFormat.format(new Date(c.validUntil))} (${days} giorni)`}
      action={expired ? <Badge tone="danger">Scaduto</Badge> : days <= 14 ? <Badge tone="warning">In scadenza</Badge> : <Badge tone="success">Attivo</Badge>}
    >
      <div className="flex flex-col gap-4 text-sm">
        {c.accounts.length ? (
          <ul className="flex flex-col gap-3">
            {c.accounts.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 rounded-[14px] bg-surface-raised p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name ?? "Conto"}</p>
                  {a.ibanMasked && <p className="font-mono text-xs text-ink-muted">{a.ibanMasked}</p>}
                </div>
                <BankAccountLinkSelect bankAccountId={a.id} accountId={a.accountId} options={accountOptions} />
                {a.accountId && (
                  <p className="text-xs text-ink-muted">
                    {awaitsPreview(a) && !expired ? "Manca la conferma del primo import: " : "Movimenti e saldi: "}
                    <Link href={`/conti/${a.accountId}?sezione=banca`} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
                      apri il conto
                    </Link>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">La banca non ha condiviso nessun conto.</p>
        )}
        <InlineConfirm
          triggerLabel="Scollega"
          triggerIcon={<Unlink />}
          message="Revoco il consenso alla banca e tolgo questi conti da MonetIO? I movimenti già registrati restano."
          confirmLabel="Scollega"
          onConfirm={() => run(() => removeBankConnection(c.id))}
        />
      </div>
    </Card>
  );
}
