import type { Metadata } from "next";
import { Suspense } from "react";
import { BanksView } from "@/components/banking/BanksView";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export const metadata: Metadata = { title: "Banche collegate" };

async function BanksContent({ searchParams }: { searchParams: Promise<{ esito?: string | string[] }> }) {
  const { esito } = await searchParams;
  return <BanksView outcome={typeof esito === "string" ? esito : undefined} />;
}

export default function BanksPage({ searchParams }: PageProps<"/dati/banche">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BanksContent searchParams={searchParams as Promise<{ esito?: string | string[] }>} />
    </Suspense>
  );
}
