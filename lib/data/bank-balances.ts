import "server-only";
import { cache } from "react";
import { type AccountBankBalances, bankBalancesByAccount } from "../banking/connections";
import { listMyBankConnections } from "./bank-connections";
import { listAccounts } from "./queries";

/** Booked and available bank balance of the viewer's linked accounts (RLS: own consents only). */
export const loadBankBalances = cache(async (): Promise<Record<string, AccountBankBalances>> => {
  const [connections, accounts] = await Promise.all([listMyBankConnections(), listAccounts()]);
  return bankBalancesByAccount(connections, Object.fromEntries(accounts.map((a) => [a.id, a.balanceCents])));
});
