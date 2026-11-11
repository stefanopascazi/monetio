// Route tabs of a section (e.g. Dati, Analisi): each tab is its own route.
export interface SectionTab {
  id: string;
  label: string;
  href: string;
}

/** Tab matching a pathname (nested routes included), or "" when none does. */
export function activeSectionTab(tabs: SectionTab[], pathname: string): string {
  return tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.id ?? "";
}
