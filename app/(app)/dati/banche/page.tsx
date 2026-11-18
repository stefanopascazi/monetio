import type { Metadata } from "next";
import { Suspense } from "react";
import { BanksView } from "@/components/banking/BanksView";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export const metadata: Metadata = { title: "Banche collegate" };

export default function BanksPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BanksView />
    </Suspense>
  );
}
