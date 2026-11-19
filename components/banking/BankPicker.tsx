"use client";

import { Link2, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, Card, Chip, Select, TextField, useToast } from "@monetio/ui";
import { startBankLink } from "@/app/actions/bank-links";
import {
  filterBanks,
  recentFirst,
  type BankOption,
} from "@/lib/banking/bank-options";

type Props = { banks: BankOption[]; recent?: string[]; sandbox: boolean };

/** Choose a bank (search, or one already used) and go to its consent page; the bank sends the person back. */
export function BankPicker({ banks, recent = [], sandbox }: Props) {
  const ordered = useMemo(() => recentFirst(banks, recent), [banks, recent]);
  const [query, setQuery] = useState("");
  const [bank, setBank] = useState(ordered[0]?.name ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const shown = useMemo(() => filterBanks(ordered, query), [ordered, query]);
  // The select always shows a visible choice: fall back to the first match when the filter hides it.
  const selected = shown.some((b) => b.name === bank)
    ? bank
    : (shown[0]?.name ?? "");

  const connect = () =>
    start(async () => {
      const res = await startBankLink(selected);
      if (res.ok && res.url) window.location.assign(res.url);
      else
        toast.show(res.message ?? "Collegamento non avviato.", {
          tone: "danger",
        });
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
                <Chip
                  key={name}
                  selected={selected === name}
                  onClick={() => {
                    setQuery("");
                    setBank(name);
                  }}
                >
                  {name}
                </Chip>
              ))}
            </div>
          )}
          <TextField
            label="Cerca banca"
            type="search"
            prefix={<Search />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Es. Intesa, BCC, Revolut"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Select
              label="Banca"
              className="sm:flex-1"
              value={selected}
              onChange={(e) => setBank(e.target.value)}
              disabled={!shown.length}
              options={shown.map((b) => ({ value: b.name, label: b.name }))}
              hint={
                shown.length
                  ? undefined
                  : "Nessuna banca corrisponde alla ricerca."
              }
            />
            <Button
              iconStart={<Link2 />}
              loading={pending}
              disabled={!selected}
              onClick={connect}
            >
              Collega
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          Enable Banking non ha restituito banche per la tua app. Riprova più
          tardi.
        </p>
      )}
    </Card>
  );
}
