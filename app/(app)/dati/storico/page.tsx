import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ImportHistoryView } from "@/components/import-history/ImportHistoryView";

export const metadata: Metadata = { title: "Storico import" };

export default function ImportHistoryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ImportHistoryView />
    </Suspense>
  );
}
