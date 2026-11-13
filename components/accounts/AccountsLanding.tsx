import { Landmark } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@monetio/ui";
import { listAccounts } from "@/lib/data/queries";
import { landingAccountId } from "@/lib/navigation/account-nav";
import { LAST_ACCOUNT_COOKIE } from "@/lib/navigation/last-account";

/** "Conti" tab: opens the last visited account, or points to the top bar "+" to create the first one. */
export async function AccountsLanding() {
  const [accounts, jar] = await Promise.all([listAccounts(), cookies()]);
  const target = landingAccountId(accounts, jar.get(LAST_ACCOUNT_COOKIE)?.value);
  if (target) redirect(`/conti/${target}`);
  return (
    <>
      <PageHeader title="Conti" />
      <EmptyState icon={<Landmark />} title="Nessun conto attivo" description="Crea il primo conto con il tasto + in alto per registrare movimenti e vedere l'estratto conto." />
    </>
  );
}
