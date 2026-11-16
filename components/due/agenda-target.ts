// Tab and item of the Scadenze page opened from a link (`?sezione=ricorrenze&apri=<id>`).
const TABS: Record<string, string> = { ricorrenze: "rules", quote: "quote" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function agendaTarget(sp: Record<string, string | string[] | undefined>): { tab?: string; open?: string } {
  const tab = TABS[first(sp.sezione) ?? ""];
  if (!tab) return {};
  const open = first(sp.apri);
  return open && UUID.test(open) ? { tab, open } : { tab };
}
