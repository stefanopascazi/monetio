// Household accounts the viewer cannot see but may send transfers to.

export interface HiddenAccount {
  id: string;
  /** Owner label, e.g. "Conto privato di Asha". */
  name: string;
  archived: boolean;
  /** Real account name, shown only to pick a transfer destination. */
  accountName?: string | null;
}

/**
 * Active hidden accounts as transfer destinations, labelled "Conto privato di Asha · Fineco".
 * Labels still equal after that (same owner and name) get a number in a stable order.
 */
export function transferTargets(hidden: HiddenAccount[]): { id: string; name: string }[] {
  const active = hidden
    .filter((h) => !h.archived)
    .map((h) => ({ id: h.id, label: h.accountName?.trim() ? `${h.name} · ${h.accountName.trim()}` : h.name }));
  const totals = new Map<string, number>();
  for (const a of active) totals.set(a.label, (totals.get(a.label) ?? 0) + 1);
  const seen = new Map<string, number>();
  return active.map((a) => {
    const n = (seen.get(a.label) ?? 0) + 1;
    seen.set(a.label, n);
    return { id: a.id, name: totals.get(a.label)! > 1 ? `${a.label} (${n})` : a.label };
  });
}
