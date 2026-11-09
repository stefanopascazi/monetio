"use client";

import { ArrowLeft, ArrowLeftRight, ChevronRight, Landmark, Plus, Repeat, Tag, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Modal } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { createContribution, createRule } from "@/app/actions/rules";
import { createTransaction } from "@/app/actions/transactions";
import { AccountForm } from "@/components/accounts/AccountForm";
import type { NamedRef } from "@/components/common/options";
import { ContributionForm } from "@/components/rules/ContributionForm";
import { RuleForm } from "@/components/rules/RuleForm";
import { CategoryCreateForm } from "@/components/settings/SettingsForms";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { defaultAccountId, type QuickCreateKind, quickCreateOptions } from "./quick-create-options";

export interface QuickCreateProps {
  accounts: NamedRef[];
  categories: NamedRef[];
  transferTargets: NamedRef[];
  today: string;
}

const ICONS: Record<QuickCreateKind, ReactNode> = {
  movement: <ArrowLeftRight />,
  rule: <Repeat />,
  contribution: <Users />,
  account: <Landmark />,
  category: <Tag />,
};

const TITLES: Record<QuickCreateKind, string> = {
  movement: "Nuovo movimento",
  rule: "Nuova ricorrenza",
  contribution: "Nuova quota automatica",
  account: "Nuovo conto",
  category: "Nuova categoria",
};

/** Top bar "+": a modal to pick what to add, then the matching form. Works from any page. */
export function QuickCreate({ accounts, categories, transferTargets, today }: QuickCreateProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<QuickCreateKind | null>(null);
  const params = useParams<{ id?: string }>();
  const options = quickCreateOptions(accounts.length > 0);

  const close = () => {
    setOpen(false);
    setKind(null);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Aggiungi"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-full bg-brand text-on-brand hover:bg-brand-hover"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>
      <Modal open={open} onOpenChange={(v) => (v ? setOpen(true) : close())} title={kind ? TITLES[kind] : "Cosa vuoi aggiungere?"}>
        {kind ? (
          <div className="flex flex-col gap-4">
            <button type="button" onClick={() => setKind(null)} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Scegli altro
            </button>
            <QuickCreateForm
              kind={kind}
              accountId={defaultAccountId(accounts.map((a) => a.id), params.id)}
              accounts={accounts}
              categories={categories}
              transferTargets={transferTargets}
              today={today}
              onDone={close}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {options.map((o) => (
              <li key={o.kind}>
                <button
                  type="button"
                  onClick={() => setKind(o.kind)}
                  className="flex w-full items-center gap-3 rounded-[18px] bg-surface-sunken p-3 text-left hover:bg-brand-soft"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised [&>svg]:size-5" aria-hidden="true">
                    {ICONS[o.kind]}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{o.label}</span>
                    <span className="text-sm text-ink-muted">{o.description}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}

interface QuickCreateFormProps extends QuickCreateProps {
  kind: QuickCreateKind;
  accountId: string;
  onDone: () => void;
}

function QuickCreateForm({ kind, accountId, accounts, categories, transferTargets, today, onDone }: QuickCreateFormProps) {
  switch (kind) {
    case "movement":
      return (
        <TransactionForm
          embedded
          plain
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          transferTargets={transferTargets}
          defaults={{ kind: "expense", accountId, bookedOn: today }}
          onSaved={onDone}
        />
      );
    case "rule":
      return <RuleForm plain action={createRule} accounts={accounts} categories={categories} transferTargets={transferTargets} today={today} onSaved={onDone} />;
    case "contribution":
      return <ContributionForm plain action={createContribution} accounts={accounts} categories={categories} onSaved={onDone} />;
    case "account":
      return <AccountForm plain action={createAccount} defaults={{ openingDate: today }} onClosed={onDone} />;
    case "category":
      return <CategoryCreateForm plain onSaved={onDone} />;
  }
}
