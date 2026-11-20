"use client";

import { useState, useTransition } from "react";
import { Alert, Amount, Button, TextField, useToast } from "@monetio/ui";
import { confirmBankSync, previewBankSync } from "@/app/actions/bank-sync";
import { useToastAction } from "@/hooks/useToastAction";
import type { CategoryOption } from "@/components/import/import-view";
import { type CategoryPick, defaultSelection, type SyncPreview, selectedTotal, withPick } from "@/lib/banking/sync/preview";
import { BankPreviewList } from "./BankPreviewList";

type Props = {
  bankAccountId: string;
  /** Suggested first day: the latest movement already recorded, else today. */
  defaultFrom: string;
  today: string;
  /** Active household categories, for the category of new movements. */
  categories?: CategoryOption[];
};

/** First sync of a newly linked account: read the bank now, choose what to import, then confirm. */
export function BankSyncPreview({ bankAccountId, defaultFrom, today, categories }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Picks in order: the server replays them on the movements it reads again from the bank.
  const [picks, setPicks] = useState<CategoryPick[]>([]);
  const [loading, startLoading] = useTransition();
  const toast = useToast();
  const { pending, run } = useToastAction();
  const busy = loading || pending;

  const load = () =>
    startLoading(async () => {
      const res = await previewBankSync(bankAccountId, from);
      if (!res.ok || !res.preview) {
        toast.show(res.message ?? "Anteprima non disponibile.", { tone: "danger" });
        return;
      }
      setPreview(res.preview);
      setSelected(new Set(defaultSelection(res.preview.items)));
      setPicks([]);
    });

  const toggle = (ref: string, value: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (value) next.add(ref);
      else next.delete(ref);
      return next;
    });

  const pickCategory = (ref: string, categoryId: string | null) => {
    setPreview((p) => p && { ...p, items: withPick(p.items, ref, categoryId) });
    setPicks((prev) => [...prev, [ref, categoryId]]);
  };

  const changeFrom = (value: string) => {
    setFrom(value);
    // A different day means different movements: the old preview no longer applies.
    setPreview(null);
  };

  const count = preview ? [...selected].length : 0;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Alert tone="info">
        Prima di aggiornare questo conto da solo, controlla cosa porterebbe la banca. Scegli da che giorno partire: i movimenti precedenti restano fuori.
      </Alert>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <TextField label="Importa dal" type="date" className="sm:flex-1" value={from} max={today} disabled={busy} onChange={(e) => changeFrom(e.target.value)} />
        <Button variant="secondary" loading={loading} disabled={busy || !from} onClick={load}>
          {preview ? "Aggiorna anteprima" : "Mostra anteprima"}
        </Button>
      </div>
      {preview && (
        <>
          <BankPreviewList
            items={preview.items}
            selected={selected}
            onToggle={toggle}
            categories={categories}
            picked={new Set(picks.map(([ref]) => ref))}
            onPickCategory={pickCategory}
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex-1 text-xs text-ink-muted">
              Movimenti nuovi scelti: <Amount cents={selectedTotal(preview.items, selected)} tone="neutral" size="sm" showSign />
            </span>
            <Button loading={pending} disabled={busy} onClick={() => run(() => confirmBankSync(bankAccountId, preview.from, [...selected], picks))}>
              {count ? `Conferma e importa (${count})` : "Conferma senza importare"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
