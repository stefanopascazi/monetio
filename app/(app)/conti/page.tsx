import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsView } from "@/components/accounts/AccountsView";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export const metadata: Metadata = { title: "Conti" };

export default function AccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountsView />
    </Suspense>
  );
}
