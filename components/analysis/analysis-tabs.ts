// Tabs of the "Analisi" section: what happened (statistics), where it is heading (projections) and the AI advisor.
import type { SectionTab } from "@/components/common/section-tabs";

export const ANALYSIS_TABS: SectionTab[] = [
  { id: "statistiche", label: "Statistiche", href: "/analisi/statistiche" },
  { id: "proiezioni", label: "Proiezioni", href: "/analisi/proiezioni" },
  { id: "chiedi", label: "Chiedi", href: "/analisi/chiedi" },
];
