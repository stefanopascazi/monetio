import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { NotificationsView } from "@/components/notifications/NotificationsView";

export const metadata: Metadata = { title: "Notifiche" };

export default function NotificationsPage() {
  return (
    <Suspense fallback={<PageSkeleton blocks={2} />}>
      <NotificationsView />
    </Suspense>
  );
}
