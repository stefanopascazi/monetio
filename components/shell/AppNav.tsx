"use client";

import { ArrowLeftRight, CalendarClock, ChartLine, DatabaseZap, Landmark, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav, type LinkLikeProps } from "@monetio/ui";
import { activeNavId, MORE_ENTRIES, NAV_ENTRIES, type NavEntry } from "./nav-items";

const ICONS: Record<string, ReactNode> = {
  home: <LayoutDashboard />,
  conti: <Landmark />,
  movimenti: <ArrowLeftRight />,
  scadenze: <CalendarClock />,
  analisi: <ChartLine />,
  dati: <DatabaseZap />,
};

const withIcon = (e: NavEntry) => ({ ...e, icon: ICONS[e.id] });

function NextLink({ href, ...rest }: LinkLikeProps) {
  return <Link href={href} {...rest} />;
}

function Nav({ activeId }: { activeId: string }) {
  return <BottomNav aria-label="Navigazione principale" linkAs={NextLink} activeId={activeId} items={NAV_ENTRIES.map(withIcon)} moreItems={MORE_ENTRIES.map(withIcon)} />;
}

/** Bottom bar on phones (secondary sections behind the drag handle), rail on wide screens. Render inside Suspense. */
export function AppNav() {
  return <Nav activeId={activeNavId(usePathname())} />;
}

/** Same nav without an active item, used as the prerendered Suspense fallback. */
export function AppNavFallback() {
  return <Nav activeId="" />;
}
