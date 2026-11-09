import { Suspense } from "react";
import { AccountCarouselSection, AccountCarouselSkeleton } from "@/components/accounts/AccountCarouselSection";

// Accounts section: the carousel lives here so switching account only swaps the page below.
export default function AccountsLayout({ children }: LayoutProps<"/conti">) {
  return (
    <>
      <Suspense fallback={<AccountCarouselSkeleton />}>
        <AccountCarouselSection />
      </Suspense>
      {children}
    </>
  );
}
