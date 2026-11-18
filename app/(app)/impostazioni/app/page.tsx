import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { AppSettingsView } from "@/components/settings/AppSettingsView";

export const metadata: Metadata = { title: "App · Impostazioni" };

export default function SettingsAppPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AppSettingsView />
    </Suspense>
  );
}
