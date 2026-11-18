import { headers } from "next/headers";
import { bankCallbackUrl } from "@/lib/banking/bank-app";
import { getMyBankApp } from "@/lib/data/bank-credentials";
import { BankAppCard } from "./BankAppCard";
import { BankCredentialsForm } from "./BankCredentialsForm";
import { BankSetupGuide } from "./BankSetupGuide";

/** "Banche collegate": guide and upload until the person's app is saved, then its status. */
export async function BanksView() {
  const [app, h] = await Promise.all([getMyBankApp(), headers()]);
  if (app) return <BankAppCard app={app} />;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return (
    <div className="flex flex-col gap-4">
      <BankSetupGuide callbackUrl={bankCallbackUrl(`${proto}://${host}`)} />
      <BankCredentialsForm />
    </div>
  );
}
