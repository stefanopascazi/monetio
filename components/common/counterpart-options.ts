import type { SelectOption } from "@monetio/ui";
import { type NamedRef, toOptions } from "./options";

/**
 * Destinations of a transfer: visible accounts, then household accounts the viewer cannot see.
 * The current destination stays listed even when no longer offered (e.g. archived).
 */
export function counterpartOptions(accounts: NamedRef[], targets: NamedRef[] = [], current?: NamedRef | null): SelectOption[] {
  const all = [...accounts, ...targets.filter((t) => !accounts.some((a) => a.id === t.id))];
  if (current?.id && !all.some((a) => a.id === current.id)) all.push(current);
  return toOptions(all);
}
