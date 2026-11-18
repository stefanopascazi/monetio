import { headers } from "next/headers";
import { Alert } from "@monetio/ui";
import { bankCallbackUrl, requestOrigin } from "@/lib/banking/bank-app";
import { LINK_OUTCOME_MESSAGE } from "@/lib/banking/connections";
import { summarizeAspsps } from "@/lib/banking/enable-banking/aspsps";
import { bankService } from "@/lib/banking/server";
import { getContext } from "@/lib/data/context";
import { getMyBankApp } from "@/lib/data/bank-credentials";
import { listMyBankConnections } from "@/lib/data/bank-connections";
import { BankAppCard } from "./BankAppCard";
import { BankConnectionList } from "./BankConnectionList";
import { BankCredentialsForm } from "./BankCredentialsForm";
import { BankPicker, type BankOption } from "./BankPicker";
import { BankSetupGuide } from "./BankSetupGuide";

/** Banks offered to the person's app; null when Enable Banking or the server key is unavailable. */
async function loadBankOptions(userId: string): Promise<BankOption[] | null> {
  try {
    const rows = summarizeAspsps(await bankService().listBanks(userId, "IT"));
    return rows.filter((r) => r.personal).map((r) => ({ name: r.name, beta: r.beta }));
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

  const [connections, banks] = await Promise.all([listMyBankConnections(), loadBankOptions(ctx.userId)]);
  return (
    <div className="flex flex-col gap-4">
      {alert}
      <BankConnectionList connections={connections} />
      {banks ? (
        <BankPicker banks={banks} sandbox={app.environment === "sandbox"} />
      ) : (
        <Alert tone="warning">Elenco delle banche non disponibile: Enable Banking non risponde o il server non è configurato.</Alert>
      )}
      <BankAppCard app={app} />
    </div>
  );
}
