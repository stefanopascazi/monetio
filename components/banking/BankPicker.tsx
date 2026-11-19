"use client";

import { Link2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, Card, Chip, SearchSelect, useToast } from "@monetio/ui";
import { startBankLink } from "@/app/actions/bank-links";
import { recentFirst, type BankOption } from "@/lib/banking/bank-options";

type Props = { banks: BankOption[]; recent?: string[]; sandbox: boolean };

/** Choose a bank (searchable list, or one already used) and go to its consent page; the bank sends the person back. */
export function BankPicker({ banks, recent = [], sandbox }: Props) {
  const options = useMemo(() => recentFirst(banks, recent).map((b) => ({ value: b.name, label: b.name })), [banks, recent]);
  const [bank, setBank] = useState(options[0]?.value ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();

  const connect = () =>
    start(async () => {
      const res = await startBankLink(bank);
      if (res.ok && res.url) window.location.assign(res.url);
      else toast.show(res.message ?? "Collegamento non avviato.", { tone: "danger" });
    });

  return (
    <Card
      title="Collega una banca"
      subtitle={
        sandbox
          ? "App di prova: scegli Mock ASPSP e usa le credenziali di test mostrate dalla pagina della banca."
          : 'Verrai mandato alla tua banca per dare il consenso in sola lettura. Arrivano solo i conti già aggiunti in "Linked accounts" sul Control Panel di Enable Banking.'
      }
    >
      {banks.length ? (
        <div className="flex flex-col gap-3">
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Banche già usate">
              {recent.map((name) => (
                <Chip key={name} selected={bank === name} onClick={() => setBank(name)}>
                  {name}
                </Chip>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SearchSelect label="Banca" className="sm:flex-1" value={bank} onChange={setBank} options={options} searchPlaceholder="Cerca banca, es. Intesa, BCC" />
            <Button iconStart={<Link2 />} loading={pending} disabled={!bank} onClick={connect}>
              Collega
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Enable Banking non ha restituito banche per la tua app. Riprova più tardi.</p>
      )}
    </Card>
  );
}
