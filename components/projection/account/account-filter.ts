import type { NamedRef } from "@/components/common/options";

/** Pseudo account id meaning "every account". */
export const ALL_ACCOUNTS = "all";

/** Accounts shown for the global selection; unknown ids fall back to all. */
export function visibleAccounts<T extends NamedRef>(accounts: T[], selected: string): T[] {
  if (selected === ALL_ACCOUNTS) return accounts;
  const one = accounts.filter((a) => a.id === selected);
  return one.length ? one : accounts;
}
