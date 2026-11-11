// Tabs of the "Dati e banche" section; each one is its own route under /dati.
import type { SectionTab } from "@/components/common/section-tabs";

export const DATA_TABS: SectionTab[] = [
  { id: "importa", label: "Importa", href: "/dati/importa" },
  { id: "storico", label: "Storico import", href: "/dati/storico" },
  { id: "banche", label: "Banche collegate", href: "/dati/banche" },
  { id: "esporta", label: "Esporta", href: "/dati/esporta" },
];
