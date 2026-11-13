import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { AdvisorView } from "@/components/advisor/AdvisorView";

export const metadata: Metadata = { title: "Chiedi" };

export default function AdvisorPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdvisorView />
    </Suspense>
  );
}
