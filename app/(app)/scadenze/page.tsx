import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { AgendaView } from "@/components/due/AgendaView";

export const metadata: Metadata = { title: "Scadenze" };

export default function DuePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AgendaView />
    </Suspense>
  );
}
