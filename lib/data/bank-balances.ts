import "server-only";
import { cache } from "react";
import { type AccountBankBalances, bankBalancesByAccount, type ProjectionPending, projectionPending } from "../banking/connections";
import { createMatcher } from "../import/matches";
import { createClient } from "../supabase/server";
import { listMyBankConnections } from "./bank-connections";
import { listAccountMatches } from "./category-matches";
import { listAccounts, listCategories } from "./queries";

/** Booked and available bank balance of the viewer's linked accounts (RLS: own consents only). */
export const loadBankBalances = cache(async (): Promise<Record<string, AccountBankBalances>> => {
  const [connections, accounts] = await Promise.all([listMyBankConnections(), listAccounts()]);
  return bankBalancesByAccount(connections, Object.fromEntries(accounts.map((a) => [a.id, a.balanceCents])));
});

/** Pending bank money of the viewer's linked accounts, for the projection; items get the account's category matches. */
export const loadProjectionPending = cache(async (): Promise<ProjectionPending> => {
  const [connections, accounts] = await Promise.all([listMyBankConnections(), listAccounts()]);
  const monetio = Object.fromEntries(accounts.filter((a) => !a.archived).map((a) => [a.id, a.balanceCents]));
  const listed = [...new Set(connections.flatMap((c) => c.accounts.filter((a) => a.accountId && a.pendingMovements?.length).map((a) => a.accountId as string)))];
  if (!listed.length) return projectionPending(connections, monetio, () => null);
  const supabase = await createClient();
  const [categories, ...matches] = await Promise.all([listCategories(), ...listed.map((id) => listAccountMatches(supabase, id))]);
  const matchers = new Map(listed.map((id, i) => [id, createMatcher(matches[i], categories)]));
  return projectionPending(connections, monetio, (accountId, item) => matchers.get(accountId)?.(item.description, item.amountCents) ?? null);
});
