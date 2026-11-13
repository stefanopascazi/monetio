import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { AdvisorPage } from "@/components/advisor/AdvisorPage";

export const metadata: Metadata = { title: "Chiedi" };

export default function ChatPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdvisorPage />
    </Suspense>
  );
}
