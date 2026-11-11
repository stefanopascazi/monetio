"use client";

import { ArrowLeftRight, CalendarClock, DatabaseZap, Landmark, LayoutDashboard, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav, type LinkLikeProps } from "@monetio/ui";
import { activeNavId, NAV_ENTRIES } from "./nav-items";

const ICONS: Record<string, ReactNode> = {
  home: <LayoutDashboard />,
  conti: <Landmark />,
  movimenti: <ArrowLeftRight />,
  scadenze: <CalendarClock />,
  proiezioni: <TrendingUp />,
  dati: <DatabaseZap />,
};

function NextLink({ href, ...rest }: LinkLikeProps) {
  return <Link href={href} {...rest} />;
}

function Nav({ activeId }: { activeId: string }) {
  return (
    <BottomNav
      aria-label="Navigazione principale"
      linkAs={NextLink}
      activeId={activeId}
      items={NAV_ENTRIES.map((e) => ({ ...e, icon: ICONS[e.id] }))}
    />
  );
}

/** Bottom bar on phones, rail on wide screens. Reads the pathname, so render it inside Suspense. */
export function AppNav() {
  return <Nav activeId={activeNavId(usePathname())} />;
}

/** Same nav without an active item, used as the prerendered Suspense fallback. */
export function AppNavFallback() {
  return <Nav activeId="" />;
}
