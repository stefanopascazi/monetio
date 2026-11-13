"use client";

import { useEffect } from "react";
import { useWideScreen } from "@/hooks/useWideScreen";
import { AdvisorChatView } from "./AdvisorChatView";
import { useAdvisor } from "./AdvisorProvider";

/**
 * Desktop: chat docked on the right, not modal. The page keeps working beside it (globals.css makes
 * room for it); Escape closes it. Phones use the /chiedi page instead.
 */
export function AdvisorPanel() {
  const { enabled, panelOpen, setPanelOpen } = useAdvisor();
  const wide = useWideScreen();
  const open = enabled && panelOpen && wide;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setPanelOpen]);

  if (!open) return null;
  return (
    <aside data-advisor-panel aria-label="Assistente IA" className="fixed inset-y-0 right-0 z-30 flex w-[400px] flex-col bg-surface shadow-[var(--mio-shadow-lg)]">
      <AdvisorChatView onClose={() => setPanelOpen(false)} />
    </aside>
  );
}
