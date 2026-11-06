"use client";

import { HandCoins, Trash2 } from "lucide-react";
import { useState } from "react";
import { Accordion, Amount, EmptyState, InlineConfirm } from "@monetio/ui";
import { deleteContribution, updateContribution } from "@/app/actions/rules";
import type { NamedRef } from "@/components/common/options";
import type { ContributionRule } from "@/lib/domain/types";
import { useToastAction } from "@/hooks/useToastAction";
import { ContributionForm } from "./ContributionForm";

export interface ContributionView extends ContributionRule {
  fromName: string;
  toName: string;
  spendingName: string;
  /** Amount for the current month with the spending booked so far. */
  currentCents: number;
  editable: boolean;
}

function Body({ c, accounts, categories, onDone }: { c: ContributionView; accounts: NamedRef[]; categories: NamedRef[]; onDone: () => void }) {
  const { run } = useToastAction();
  if (!c.editable) return <p className="pb-2 text-sm text-ink-muted">Può modificarla solo chi vede il conto di partenza.</p>;
  return (
    <div className="flex flex-col gap-4 pb-2">
      <ContributionForm contribution={c} action={updateContribution.bind(null, c.id)} accounts={accounts} categories={categories} onSaved={onDone} />
      <InlineConfirm
        triggerLabel="Elimina quota"
        triggerIcon={<Trash2 />}
        message="Elimino la quota automatica? I versamenti già registrati restano."
        confirmLabel="Elimina"
        onConfirm={() => run(() => deleteContribution(c.id), onDone)}
      />
    </div>
  );
}

export function ContributionList({ items, accounts, categories }: { items: ContributionView[]; accounts: NamedRef[]; categories: NamedRef[] }) {
  const [open, setOpen] = useState<string[]>([]);
  if (!items.length) return <EmptyState icon={<HandCoins />} title="Nessuna quota" description="Le quote spostano ogni mese denaro verso un conto condiviso." />;
  return (
    <Accordion
      type="single"
      value={open}
      onValueChange={setOpen}
      items={items.map((c) => ({
        id: c.id,
        title: (
          <span className="flex min-w-0 flex-col text-left">
            <span className="truncate font-semibold">{c.description}</span>
            <span className="truncate text-sm font-normal text-ink-muted">
              {c.fromName} → {c.toName} · giorno {c.dayOfMonth}
              {c.fixedCents > 0 ? " · quota fissa" : ""}
              {c.sharePercent > 0 ? ` · ${c.sharePercent}% spese su ${c.spendingName}${c.spendingMonthOffset === -1 ? " del mese prima" : ""}` : ""}
            </span>
          </span>
        ),
        meta: (
          <span className="flex flex-col items-end">
            <Amount cents={c.currentCents} tone="transfer" />
            <span className="text-xs text-ink-subtle">questo mese</span>
          </span>
        ),
        content: open.includes(c.id) ? <Body c={c} accounts={accounts} categories={categories} onDone={() => setOpen([])} /> : null,
      }))}
    />
  );
}
