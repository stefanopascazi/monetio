import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { TransactionsView } from "@/components/transactions/TransactionsView";

export const metadata: Metadata = { title: "Movimenti" };

export default function TransactionsPage({ searchParams }: PageProps<"/movimenti">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransactionsView searchParams={searchParams} />
    </Suspense>
  );
}
