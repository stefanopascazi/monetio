"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";
import { type AdvisorChat, useAdvisorChat } from "@/hooks/useAdvisorChat";

interface AdvisorShell {
  /** False when the server has no API key: no bubble, no panel. */
  enabled: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  chat: AdvisorChat;
}

const AdvisorContext = createContext<AdvisorShell | null>(null);

/** Keeps one chat alive across pages, shared by the desktop panel and the /chiedi page. */
export function AdvisorProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const chat = useAdvisorChat();
  const value = useMemo(() => ({ enabled, panelOpen, setPanelOpen, chat }), [enabled, panelOpen, chat]);
  return <AdvisorContext.Provider value={value}>{children}</AdvisorContext.Provider>;
}

export function useAdvisor(): AdvisorShell {
  const ctx = useContext(AdvisorContext);
  if (!ctx) throw new Error("useAdvisor outside AdvisorProvider");
  return ctx;
}
