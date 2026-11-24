import { BankAccountPanel } from "@/components/banking/BankAccountPanel";
import { awaitsPreview, bankAccountsFor, isConsentExpired } from "@/lib/banking/connections";
import { lastBookedOnByAccount, listMyBankConnections } from "@/lib/data/bank-connections";
import { listRecentBankSyncBatches } from "@/lib/data/bank-sync-batches";
import { listCategories } from "@/lib/data/queries";

type Props = { accountId: string; balanceCents: number; today: string };

/** Bank feeding this account: balances, first import, sync status and history, as in the bank settings. */
export async function AccountBankCard({ accountId, balanceCents, today }: Props) {
  const linked = bankAccountsFor(await listMyBankConnections(), accountId);
  if (!linked.length) return null;
  const now = new Date();
  const [batches, categories, lastBookedOn] = await Promise.all([
    listRecentBankSyncBatches([accountId]),
    listCategories(),
    linked.some((l) => awaitsPreview(l.account)) ? lastBookedOnByAccount([accountId]) : Promise.resolve({} as Record<string, string>),
  ]);
  const active = categories.filter((c) => !c.archived).map(({ id, name, kind }) => ({ id, name, kind }));
  return (
    <>
      {linked.map(({ connection, account }) => (
        <BankAccountPanel
          key={account.id}
          title={connection.bankName}
          account={account}
          expired={isConsentExpired(connection, now)}
          monetioBalanceCents={balanceCents}
          defaultFrom={lastBookedOn[accountId] || today}
          batches={batches[accountId] ?? []}
          categories={active}
          today={today}
          now={now}
        />
      ))}
    </>
  );
}
