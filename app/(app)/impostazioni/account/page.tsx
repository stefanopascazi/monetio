import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { AccountSettingsView } from "@/components/settings/AccountSettingsView";

export const metadata: Metadata = { title: "Account · Impostazioni" };

export default function SettingsAccountPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountSettingsView />
    </Suspense>
  );
}
