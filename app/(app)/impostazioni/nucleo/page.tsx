import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { HouseholdSettingsView } from "@/components/settings/HouseholdSettingsView";

export const metadata: Metadata = { title: "Nucleo · Impostazioni" };

export default function SettingsNucleoPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HouseholdSettingsView />
    </Suspense>
  );
}
