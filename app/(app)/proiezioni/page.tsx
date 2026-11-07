import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ProjectionView } from "@/components/projection/ProjectionView";

export const metadata: Metadata = { title: "Proiezioni" };

export default function ProjectionPage({ searchParams }: PageProps<"/proiezioni">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectionContent searchParams={searchParams} />
    </Suspense>
  );
}

// Plain params keep the cached view's arguments serializable.
async function ProjectionContent({ searchParams }: Pick<PageProps<"/proiezioni">, "searchParams">) {
  return <ProjectionView sp={await searchParams} />;
}
