import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ImportView } from "@/components/import/ImportView";

export const metadata: Metadata = { title: "Importa movimenti" };

export default function ImportPage({ searchParams }: PageProps<"/dati/importa">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ImportView searchParams={searchParams} />
    </Suspense>
  );
}
