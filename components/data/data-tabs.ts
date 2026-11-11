// Tabs of the "Dati e banche" section; each one is its own route under /dati.
export interface DataTab {
  id: string;
  label: string;
  href: string;
}

export const DATA_TABS: DataTab[] = [
  { id: "importa", label: "Importa", href: "/dati/importa" },
  { id: "storico", label: "Storico import", href: "/dati/storico" },
  { id: "banche", label: "Banche collegate", href: "/dati/banche" },
  { id: "esporta", label: "Esporta", href: "/dati/esporta" },
];

export function activeDataTab(pathname: string): string {
  return DATA_TABS.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.id ?? "";
}
