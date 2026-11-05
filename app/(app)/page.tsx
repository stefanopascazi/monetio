import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={4} />}>
      <Dashboard />
    </Suspense>
  );
}
