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

/** Account detail header: title row with the gear always on the right, then context and balance. */
export function AccountHeader({ name, context, institution, balanceCents, settings, note }: AccountHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 truncate font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">{name}</h1>
        {settings}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-ink-muted">{institution ? `${context} · ${institution}` : context}</p>
        <span className="flex flex-col items-end gap-2">
          <Amount cents={balanceCents} tone="neutral" size="xl" />
          {note}
        </span>
      </div>
    </header>
  );
}
