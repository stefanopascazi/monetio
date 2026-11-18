import { Suspense } from "react";
import { PageHeader } from "@monetio/ui";
import { SettingsNav, SettingsNavFallback } from "@/components/settings/SettingsNav";

export default function SettingsLayout({ children }: LayoutProps<"/impostazioni">) {
  return (
    <>
      <PageHeader title="Impostazioni" description="Il tuo account, il nucleo che condividi e le preferenze dell'app." />
      <Suspense fallback={<SettingsNavFallback />}>
        <SettingsNav />
      </Suspense>
      {children}
    </>
  );
}
