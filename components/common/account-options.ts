import type { SelectOption } from "@monetio/ui";
import { type NamedRef, toOptions } from "./options";

/**
 * Account options: visible accounts, then (for transfer destinations) household accounts the viewer cannot see.
 * The current value stays listed even when not offered (hidden payer, archived account).
 */
export function accountOptions(accounts: NamedRef[], targets: NamedRef[] = [], current?: NamedRef | null): SelectOption[] {
  const all = [...accounts, ...targets.filter((t) => !accounts.some((a) => a.id === t.id))];
  if (current?.id && !all.some((a) => a.id === current.id)) all.push(current);
  return toOptions(all);
}
