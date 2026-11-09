"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Amount, Button, Card } from "@monetio/ui";
import { setAccountArchived } from "@/app/actions/accounts";
import { useToastAction } from "@/hooks/useToastAction";
import { BALANCES_CLASS } from "@/lib/privacy/balance-privacy";

export interface ArchivedAccount {
  id: string;
  name: string;
  institution: string | null;
  balanceCents: number;
}

/** Archived accounts, folded by default: open the statement or restore them. */
export function ArchivedAccounts({ accounts }: { accounts: ArchivedAccount[] }) {
  const { run, pending } = useToastAction();
  if (!accounts.length) return null;
  return (
    <Card title={`Conti archiviati (${accounts.length})`} subtitle="Non compaiono nel selettore dei conti finché non li ripristini" collapsible defaultOpen={false}>
      <ul className={`grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 ${BALANCES_CLASS}`}>
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-sunken px-4 py-2">
            <Link href={`/conti/${a.id}`} className="flex min-w-0 flex-col hover:underline">
              <span className="truncate font-semibold">{a.name}</span>
              <span className="flex gap-2 text-xs text-ink-muted">
                {a.institution && <span className="truncate">{a.institution}</span>}
                <Amount cents={a.balanceCents} tone="neutral" size="sm" />
              </span>
            </Link>
            <Button variant="ghost" size="sm" iconStart={<RotateCcw />} disabled={pending} onClick={() => run(() => setAccountArchived(a.id, false))}>
              Ripristina
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
