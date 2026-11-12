// Picks the notifications a user should get from a household snapshot. Pure: the worker feeds it
// the same agenda and projection input the app builds, and stores one outbox row per event.
// Planning-only content (see docs/ai-advisor.md): reminders and facts, never financial advice.
import { addDays, daysBetween, monthKey } from "../domain/dates";
import { isDecreasing, spentCents } from "../domain/estimates";
import { projectBalances, projectedMovements } from "../domain/projection";
import type { DueEntry } from "../domain/schedule";
import type { Agenda, buildProjectionInput } from "../data/projection-input";
import { ownsRule } from "../data/rule-visibility";
import type { NotificationKind, NotificationPrefs } from "./prefs";

export interface NotificationEvent {
  kind: NotificationKind;
  /** Unique per user and occurrence: the outbox ignores repeats. */
  dedupKey: string;
  title: string;
  body: string;
  url: string;
}

export interface EventSnapshot {
  userId: string;
  householdId: string;
  /** Household name, shown only to users of several households. */
  householdLabel: string | null;
  prefs: NotificationPrefs;
  agenda: Agenda;
  projection: ReturnType<typeof buildProjectionInput>;
  /** Latest booked movement per visible account. */
  lastBooked: Record<string, string | null>;
}

/** Overdue items older than this are not announced (first run, long-forgotten items). */
export const OVERDUE_WINDOW_DAYS = 7;

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const formatEuro = (cents: number) => money.format(cents / 100);

/** Account name for a notification text (visible accounts only, else a generic word). */
export const accountName = (s: Pick<EventSnapshot, "projection">, id: string) => s.projection.active.find((a) => a.id === id)?.name ?? "conto";

const suffix = (s: EventSnapshot) => (s.householdLabel ? ` · ${s.householdLabel}` : "");
const key = (s: EventSnapshot, ...parts: string[]) => [parts[0], s.userId, s.householdId, ...parts.slice(1)].join(":");

function dueLabel(days: number): string {
  if (days === 0) return "Scadenza oggi";
  if (days === 1) return "Scadenza domani";
  return `Scadenza tra ${days} giorni`;
}

/** Due items on accounts the user manages: reminder N days before, once overdue. */
export function dueEvents(s: EventSnapshot): NotificationEvent[] {
  const today = s.agenda.today;
  const visible = s.projection.ids;
  const mine = (e: DueEntry) => (e.source === "rule" ? ownsRule(e, visible) : visible.has(e.accountId));
  const events: NotificationEvent[] = [];
  // Nothing to pay (e.g. an empty card statement): no reminder.
  for (const e of s.agenda.due.filter((d) => mine(d) && d.amountCents !== 0)) {
    const days = daysBetween(today, e.date);
    const what = `${e.description} · ${accountName(s, e.accountId)} · ${formatEuro(Math.abs(e.amountCents))}${e.estimated ? " (stimato)" : ""}`;
    if (e.overdue && days >= -OVERDUE_WINDOW_DAYS) {
      events.push({ kind: "overdue", dedupKey: key(s, "overdue", e.key), title: "Scadenza superata", body: what + suffix(s), url: "/scadenze" });
    } else if (!e.overdue && days >= 0 && days <= s.prefs.dueDays) {
      events.push({ kind: "due_soon", dedupKey: key(s, "due_soon", e.key), title: dueLabel(days), body: what + suffix(s), url: "/scadenze" });
    }
  }
  return events;
}

/** Visible non-card accounts whose expected month-end balance falls below the user's threshold. */
export function lowBalanceEvents(s: EventSnapshot): NotificationEvent[] {
  const monthEnd = projectBalances({ ...s.projection.input, months: 1 })[0]?.byAccount ?? {};
  const month = monthKey(s.agenda.today);
  return s.projection.active
    .filter((a) => a.type !== "card" && a.id in monthEnd)
    .filter((a) => monthEnd[a.id] < (s.prefs.lowBalanceCents[a.id] ?? 0))
    .map((a) => ({
      kind: "low_balance" as const,
      dedupKey: key(s, "low_balance", a.id, month),
      title: "Rimanenza sotto soglia",
      body: `${a.name}: a fine mese sono previsti ${formatEuro(monthEnd[a.id])}${suffix(s)}`,
      url: `/conti/${a.id}`,
    }));
}

/** Visible accounts with no booked movement for `staleDays`: their projections lose accuracy. */
export function staleAccountEvents(s: EventSnapshot): NotificationEvent[] {
  const today = s.agenda.today;
  const limit = addDays(today, -s.prefs.staleDays);
  return s.projection.active.flatMap((a) => {
    const last = s.lastBooked[a.id] ?? null;
    const since = last ?? a.openingDate;
    if (since > limit) return [];
    return [
      {
        kind: "stale_account" as const,
        dedupKey: key(s, "stale_account", a.id, since),
        title: "Conto da aggiornare",
        body: `${a.name}: nessun movimento da ${daysBetween(since, today)} giorni. Aggiornalo per proiezioni affidabili${suffix(s)}`,
        url: `/conti/${a.id}`,
      },
    ];
  });
}

/**
 * Decreasing expense estimates whose categories went beyond them this month. Read from the
 * projection's estimate usage, the same figure the account page shows; fixed estimates track no spending.
 */
export function budgetEvents(s: EventSnapshot): NotificationEvent[] {
  const month = monthKey(s.agenda.today);
  const visible = s.projection.ids;
  const movements = projectedMovements(s.projection.input).filter((m) => m.source === "estimate" && m.usage && monthKey(m.date) === month);
  return s.agenda.rules
    .filter((r) => r.active && isDecreasing(r) && r.amountCents < 0 && ownsRule(r, visible))
    .flatMap((r) => {
      const usage = movements.find((m) => m.accountId === r.accountId && m.ref?.startsWith(`r:${r.id}|`))?.usage;
      if (!usage || usage.overCents <= 0) return [];
      return [
        {
          kind: "budget_exceeded" as const,
          dedupKey: key(s, "budget_exceeded", r.id, month),
          title: "Stima superata",
          body: `${r.description} · ${accountName(s, r.accountId)}: ${formatEuro(spentCents(usage))} su ${formatEuro(usage.totalCents)} previsti questo mese${suffix(s)}`,
          url: `/conti/${r.accountId}`,
        },
      ];
    });
}

export function selectEvents(s: EventSnapshot): NotificationEvent[] {
  return [...dueEvents(s), ...lowBalanceEvents(s), ...staleAccountEvents(s), ...budgetEvents(s)];
}
