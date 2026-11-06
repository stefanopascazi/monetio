// Household accounts the viewer cannot see but may send transfers to.

export interface HiddenAccount {
  id: string;
  /** Owner label, e.g. "Conto privato di Asha". */
  name: string;
  archived: boolean;
}

/**
 * Active hidden accounts as transfer destinations. Names stay private, so an owner with
 * several accounts gets numbered labels ("Conto privato di Asha (2)") in a stable order.
 */
export function transferTargets(hidden: HiddenAccount[]): { id: string; name: string }[] {
  const active = hidden.filter((h) => !h.archived);
  const totals = new Map<string, number>();
  for (const h of active) totals.set(h.name, (totals.get(h.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  return active.map((h) => {
    const n = (seen.get(h.name) ?? 0) + 1;
    seen.set(h.name, n);
    return { id: h.id, name: totals.get(h.name)! > 1 ? `${h.name} (${n})` : h.name };
  });
}
