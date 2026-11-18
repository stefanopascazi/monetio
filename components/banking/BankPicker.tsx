"use client";

import { Link2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, Card, Select, useToast } from "@monetio/ui";
import { startBankLink } from "@/app/actions/bank-links";

export type BankOption = { name: string; beta: boolean };

/** Choose a bank and go to its consent page; the bank sends the person back to MonetIO. */
export function BankPicker({ banks, sandbox }: { banks: BankOption[]; sandbox: boolean }) {
  const [bank, setBank] = useState(banks[0]?.name ?? "");
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
          : "Verrai mandato alla tua banca per dare il consenso in sola lettura. Puoi revocarlo quando vuoi."
      }
    >
      {banks.length ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            label="Banca"
            className="sm:flex-1"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            options={banks.map((b) => ({ value: b.name, label: b.beta ? `${b.name} (beta)` : b.name }))}
          />
          <Button iconStart={<Link2 />} loading={pending} disabled={!bank} onClick={connect}>
            Collega
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Enable Banking non ha restituito banche per la tua app. Riprova più tardi.</p>
      )}
    </Card>
  );
}
