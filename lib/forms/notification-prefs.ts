// Notification preferences form (Impostazioni > Notifiche). Error messages are Italian UI copy.
import { NOTIFICATION_KINDS, type NotificationKind, type NotificationPrefs } from "../notifications/prefs";
import { Checker, isUUID, type ParseResult, text } from "./parse";

/** Hidden field carrying an account's threshold in cents: `lowCents:<account id>`. */
export const LOW_PREFIX = "lowCents:";

const int = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);

export function parsePrefsForm(fd: FormData): ParseResult<NotificationPrefs> {
  const c = new Checker();
  const muted = fd.getAll("pushMuted").map(String);
  const pushMutedKinds = NOTIFICATION_KINDS.filter((k) => muted.includes(k)) as NotificationKind[];

  const startRaw = text(fd, "quietStart");
  const endRaw = text(fd, "quietEnd");
  const start = int(startRaw);
  const end = int(endRaw);
  const quietOn = startRaw !== "" || endRaw !== "";
  if (quietOn) {
    c.check(start !== null && start <= 23, "quietStart", "Scegli un'ora");
    c.check(end !== null && end <= 23, "quietEnd", "Scegli un'ora");
    c.check(start === null || end === null || start !== end, "quietEnd", "Inizio e fine devono essere diversi");
  }

  const dueDays = int(text(fd, "dueDays"));
  c.check(dueDays !== null && dueDays <= 14, "dueDays", "Da 0 a 14 giorni");
  const staleDays = int(text(fd, "staleDays"));
  c.check(staleDays !== null && staleDays >= 3 && staleDays <= 90, "staleDays", "Da 3 a 90 giorni");

  const lowBalanceCents: Record<string, number> = {};
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith(LOW_PREFIX)) continue;
    const id = key.slice(LOW_PREFIX.length);
    const raw = String(value).trim();
    if (!isUUID(id) || raw === "") continue;
    const cents = int(raw);
    c.check(cents !== null && cents <= 100_000_000, key, "Importo non valido");
    if (cents !== null && cents > 0) lowBalanceCents[id] = cents;
  }

  return c.result({
    pushMutedKinds,
    quietHours: quietOn && start !== null && end !== null ? { start, end } : null,
    dueDays: dueDays ?? 0,
    staleDays: staleDays ?? 14,
    lowBalanceCents,
  });
}
