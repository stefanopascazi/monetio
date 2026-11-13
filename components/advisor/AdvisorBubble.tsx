"use client";

import { Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { WIDE_QUERY } from "@/hooks/useWideScreen";
import { useAdvisor } from "./AdvisorProvider";

/** Floating entry point on every page: side panel on wide screens, the /chiedi page on phones. */
export function AdvisorBubble() {
  const { enabled, panelOpen, setPanelOpen } = useAdvisor();
  const pathname = usePathname();
  const router = useRouter();
  if (!enabled || panelOpen || pathname === "/chiedi") return null;

  const open = () => {
    if (window.matchMedia(WIDE_QUERY).matches) setPanelOpen(true);
    else router.push("/chiedi");
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Apri l'assistente"
      title="Chiedi all'assistente"
      // Phones: above the floating nav (about 80px); wide screens: bottom-right corner.
      className="fixed right-[max(16px,env(safe-area-inset-right))] bottom-[calc(96px+env(safe-area-inset-bottom))] z-[25] grid size-14 place-items-center rounded-full bg-brand text-on-brand shadow-[var(--mio-shadow-lg)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 min-[960px]:right-6 min-[960px]:bottom-6"
    >
      <Sparkles aria-hidden="true" className="size-6" />
    </button>
  );
}
