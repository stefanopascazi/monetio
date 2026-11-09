import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountsLanding } from "@/components/accounts/AccountsLanding";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export const metadata: Metadata = { title: "Conti" };

export default function AccountsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AccountsLanding />
    </Suspense>
  );
}
