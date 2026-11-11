import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { StatisticsView } from "@/components/statistics/StatisticsView";

export const metadata: Metadata = { title: "Statistiche" };

export default function StatisticsPage({ searchParams }: PageProps<"/analisi/statistiche">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StatisticsView searchParams={searchParams} />
    </Suspense>
  );
}
