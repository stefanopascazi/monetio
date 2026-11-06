import type { ReactNode } from "react";
import { Amount } from "@monetio/ui";

export interface AccountHeaderProps {
  name: string;
  /** Visibility line, e.g. "Conto condiviso". */
  context: string;
  institution?: string | null;
  balanceCents: number;
  /** Right-aligned slot on the title row (settings gear). */
  settings?: ReactNode;
  /** Shown under the balance (pending transfers). */
  note?: ReactNode;
}

/**
 * Account detail header: title row with the gear always on the right, then context and balance.
 * Rendered as siblings (no wrapper) so the title row can stay sticky across the whole page on phones.
 */
export function AccountHeader({ name, context, institution, balanceCents, settings, note }: AccountHeaderProps) {
  return (
    <>
      <div
        data-testid="account-title-bar"
        className="sticky top-0 z-20 -mx-4 -my-3 flex items-center justify-between gap-3 bg-bg px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] min-[960px]:static min-[960px]:mx-0 min-[960px]:my-0 min-[960px]:p-0"
      >
        <h1 className="min-w-0 truncate font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">{name}</h1>
        {settings}
      </div>
      <div className="-mt-4 flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">{institution ? `${context} · ${institution}` : context}</p>
        <span className="flex flex-col items-end gap-2">
          <Amount cents={balanceCents} tone="neutral" size="xl" />
          {note}
        </span>
      </div>
    </>
  );
}
