import { headers } from "next/headers";
import { Alert } from "@monetio/ui";
import { bankCallbackUrl, requestOrigin } from "@/lib/banking/bank-app";
import { recentBanks, type BankOption } from "@/lib/banking/bank-options";
import { LINK_OUTCOME_MESSAGE } from "@/lib/banking/connections";
import { summarizeAspsps } from "@/lib/banking/enable-banking/aspsps";
import { bankService } from "@/lib/banking/server";
import { getContext } from "@/lib/data/context";
import { getMyBankApp } from "@/lib/data/bank-credentials";
import { lastBookedOnByAccount, listMyBankConnections } from "@/lib/data/bank-connections";
import { awaitsPreview } from "@/lib/banking/connections";
import { todayISO } from "@/lib/domain/dates";
import { listOpenBankReviews } from "@/lib/data/bank-reviews";
import { listRecentBankSyncBatches } from "@/lib/data/bank-sync-batches";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { BankAppCard } from "./BankAppCard";
import { BankConnectionList } from "./BankConnectionList";
import { BankCredentialsForm } from "./BankCredentialsForm";
import { BankPicker } from "./BankPicker";
import { BankReviewList } from "./BankReviewList";
import { BankSetupGuide } from "./BankSetupGuide";

/** Banks offered to the person's app; null when Enable Banking or the server key is unavailable. */
async function loadBankOptions(userId: string): Promise<BankOption[] | null> {
  try {
    const rows = summarizeAspsps(await bankService().listBanks(userId, "IT"));
    return rows.filter((r) => r.personal).map((r) => ({ name: r.name }));
  } catch (error) {
    console.error("[banking] list banks failed", error instanceof Error ? error.name : "unknown");
    return null;
  }
}

/** "Banche collegate": guide and upload until the person's app is saved, then banks and consents. */
export async function BanksView({ outcome }: { outcome?: string }) {
  const ctx = await getContext();
  const [app, h] = await Promise.all([getMyBankApp(), headers()]);
  const notice = outcome ? LINK_OUTCOME_MESSAGE[outcome] : undefined;
  const alert = notice && <Alert tone={notice.tone}>{notice.text}</Alert>;

  if (!app) {
    return (
      <div className="flex flex-col gap-4">
        {alert}
        <BankSetupGuide callbackUrl={bankCallbackUrl(requestOrigin((n) => h.get(n)))} />
        <BankCredentialsForm />
      </div>
    );
  }

  const [connections, banks, accounts, reviews, categories] = await Promise.all([
    listMyBankConnections(),
    loadBankOptions(ctx.userId),
    listAccounts(),
    listOpenBankReviews(),
    listCategories(),
  ]);
  const pendingIds = connections.flatMap((c) => c.accounts.filter(awaitsPreview).map((a) => a.accountId as string));
  const linkedIds = [...new Set(connections.flatMap((c) => c.accounts.flatMap((a) => (a.accountId ? [a.accountId] : []))))];
  const [lastBookedOn, batches] = await Promise.all([lastBookedOnByAccount(pendingIds), listRecentBankSyncBatches(linkedIds)]);
  const accountOptions = accounts.filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name }));
  const activeCategories = categories.filter((c) => !c.archived).map(({ id, name, kind }) => ({ id, name, kind }));
  const balances = Object.fromEntries(accounts.map((a) => [a.id, a.balanceCents]));
  return (
    <div className="flex flex-col gap-4">
      {alert}
      <BankReviewList reviews={reviews} />
      <BankConnectionList connections={connections} accountOptions={accountOptions} balances={balances} lastBookedOn={lastBookedOn} batches={batches} categories={activeCategories} today={todayISO()} />
      {banks ? (
        <BankPicker banks={banks} recent={recentBanks(banks, connections.map((c) => c.bankName))} sandbox={app.environment === "sandbox"} />
      ) : (
        <Alert tone="warning">Elenco delle banche non disponibile: Enable Banking non risponde o il server non è configurato.</Alert>
      )}
      <BankAppCard app={app} />
    </div>
  );
}
