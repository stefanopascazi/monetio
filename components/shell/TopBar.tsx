import { CircleUserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BalancePrivacyToggle } from "./BalancePrivacyToggle";
import { TOPBAR_ID, TOPBAR_SLOT_ID } from "./topbar-ids";

/**
 * Sticky wordmark bar: page actions slot (filled via TopBarAction), quick-create "+", notifications bell,
 * balance privacy toggle and personal area link. Static itself: session data arrives through the slots.
 */
export function TopBar({ create, bell }: { create?: ReactNode; bell?: ReactNode }) {
  return (
    <header
      id={TOPBAR_ID}
      className="sticky top-0 z-30 -mx-4 -mt-6 flex items-center justify-between gap-3 bg-bg px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-3"
    >
      <Link href="/" className="font-display text-xl font-bold tracking-tight">
        monet<span className="text-brand-ink">io</span>
      </Link>
      <div className="flex items-center gap-2">
        <div id={TOPBAR_SLOT_ID} className="flex items-center gap-2 empty:hidden" />
        {create}
        {bell}
        <BalancePrivacyToggle />
        <Link
          href="/impostazioni"
          aria-label="Profilo e impostazioni"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink"
        >
          <CircleUserRound className="size-6" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
