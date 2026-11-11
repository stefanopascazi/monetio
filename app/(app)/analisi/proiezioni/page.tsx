import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ProjectionView } from "@/components/projection/ProjectionView";

export const metadata: Metadata = { title: "Proiezioni" };

export default function ProjectionPage({ searchParams }: PageProps<"/analisi/proiezioni">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectionView searchParams={searchParams} />
    </Suspense>
  );
}
