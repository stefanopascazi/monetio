// Notification kinds and per-user preferences (notification_prefs). Shared by the app and the worker.

export const NOTIFICATION_KINDS = ["due_soon", "overdue", "low_balance", "stale_account", "budget_exceeded"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const KIND_LABELS: Record<NotificationKind, string> = {
  due_soon: "Scadenze in arrivo",
  overdue: "Scadenze superate",
  low_balance: "Rimanenza sotto soglia",
  stale_account: "Conti da aggiornare",
  budget_exceeded: "Stime superate",
};

export interface NotificationPrefs {
  /** Kinds whose push is off; they still reach the bell. */
  pushMutedKinds: NotificationKind[];
  /** Quiet hours (Europe/Rome, whole hours); null = off. */
  quietHours: { start: number; end: number } | null;
  /** Days before a due date to remind it (0 = on the day). */
  dueDays: number;
  /** Days without booked movements before an account is flagged. */
  staleDays: number;
  /** Month-end threshold per account (cents); missing = 0. */
  lowBalanceCents: Record<string, number>;
}

export const DEFAULT_PREFS: NotificationPrefs = { pushMutedKinds: [], quietHours: null, dueDays: 3, staleDays: 14, lowBalanceCents: {} };

const isKind = (v: unknown): v is NotificationKind => NOTIFICATION_KINDS.includes(v as NotificationKind);
const hour = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23 ? (v as number) : null);

/** notification_prefs row (snake_case, as PostgREST/json returns it) to prefs; null row = defaults. */
export function mapPrefs(row: Record<string, unknown> | null | undefined): NotificationPrefs {
  if (!row) return DEFAULT_PREFS;
  const start = hour(row.quiet_start);
  const end = hour(row.quiet_end);
  const thresholds: Record<string, number> = {};
  const raw = row.low_balance_cents;
  if (raw && typeof raw === "object") {
    for (const [id, cents] of Object.entries(raw as Record<string, unknown>)) if (Number.isInteger(cents)) thresholds[id] = cents as number;
  }
  return {
    pushMutedKinds: Array.isArray(row.push_muted_kinds) ? row.push_muted_kinds.filter(isKind) : [],
    quietHours: start !== null && end !== null && start !== end ? { start, end } : null,
    dueDays: Number.isInteger(row.due_days) ? (row.due_days as number) : DEFAULT_PREFS.dueDays,
    staleDays: Number.isInteger(row.stale_days) ? (row.stale_days as number) : DEFAULT_PREFS.staleDays,
    lowBalanceCents: thresholds,
  };
}

/** Prefs to a notification_prefs row (without user_id). */
export function prefsToRow(p: NotificationPrefs) {
  return {
    push_muted_kinds: p.pushMutedKinds,
    quiet_start: p.quietHours?.start ?? null,
    quiet_end: p.quietHours?.end ?? null,
    due_days: p.dueDays,
    stale_days: p.staleDays,
    low_balance_cents: p.lowBalanceCents,
  };
}
