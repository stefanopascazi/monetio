export interface NavEntry {
  id: string;
  label: string;
  href: string;
  /** Desktop rail only: the phone bar keeps five items. */
  railOnly?: boolean;
}

export const NAV_ENTRIES: NavEntry[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "conti", label: "Conti", href: "/conti" },
  { id: "movimenti", label: "Movimenti", href: "/movimenti" },
  { id: "scadenze", label: "Scadenze", href: "/scadenze" },
  { id: "proiezioni", label: "Proiezioni", href: "/proiezioni" },
  { id: "dati", label: "Dati", href: "/dati", railOnly: true },
];

/** Nav item matching a pathname (nested routes highlight their section). */
export function activeNavId(pathname: string): string {
  const match = NAV_ENTRIES.filter((e) => e.href !== "/" && (pathname === e.href || pathname.startsWith(`${e.href}/`)));
  return match[0]?.id ?? (pathname === "/" ? "home" : "");
}
