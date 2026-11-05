import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Impostazioni" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsView />
    </Suspense>
  );
}
