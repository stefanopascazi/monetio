export interface NavEntry {
  id: string;
  label: string;
  href: string;
}

/** Always visible in the phone bar (and first in the desktop rail). */
export const NAV_ENTRIES: NavEntry[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "conti", label: "Conti", href: "/conti" },
  { id: "movimenti", label: "Movimenti", href: "/movimenti" },
  { id: "scadenze", label: "Scadenze", href: "/scadenze" },
];

/** Phones: in the panel opened by dragging the bar up. Rail: in the column opened by "Altro". New sections go here. */
export const MORE_ENTRIES: NavEntry[] = [
  { id: "proiezioni", label: "Proiezioni", href: "/proiezioni" },
  { id: "dati", label: "Dati", href: "/dati" },
];

/** Nav item matching a pathname (nested routes highlight their section). */
export function activeNavId(pathname: string): string {
  const match = [...NAV_ENTRIES, ...MORE_ENTRIES].filter((e) => e.href !== "/" && (pathname === e.href || pathname.startsWith(`${e.href}/`)));
  return match[0]?.id ?? (pathname === "/" ? "home" : "");
}
