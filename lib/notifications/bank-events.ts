// Bank sync reminders: a consent about to end (the sync stops without it) and movements waiting in
// the "Da rivedere" queue.
import { consentDaysLeft } from "../banking/connections";
import type { NotificationEvent } from "./events";

export type BankConsentInfo = { id: string; bankName: string; validUntil: string; status: string };

export interface BankSnapshot {
  /** The user's own consents in the household (only the owner can renew them). */
  consents: BankConsentInfo[];
  /** Open review items on accounts the user sees; `latestAt` changes when new ones arrive. */
  openReviews: { count: number; latestAt: string | null };
}

/** Reminder steps before the end: one notification each, then one when it has ended. */
export const CONSENT_REMINDER_DAYS = [14, 7, 1] as const;

type Ctx = { userId: string; householdId: string; suffix: string; now: Date };

const key = (c: Ctx, kind: string, ...parts: string[]) => [kind, c.userId, c.householdId, ...parts].join(":");

/** Smallest reminder step the consent is within, "ended" once over, null before the first step. */
export function consentStep(validUntil: string, status: string, now: Date): string | null {
  const days = consentDaysLeft(validUntil, now);
  if (status !== "active" || days === 0) return "ended";
  const steps = CONSENT_REMINDER_DAYS.filter((d) => days <= d);
  return steps.length ? String(steps[steps.length - 1]) : null;
}

export function bankConsentEvents(bank: BankSnapshot, c: Ctx): NotificationEvent[] {
  return bank.consents.flatMap((consent) => {
    if (consent.status === "revoked") return [];
    const step = consentStep(consent.validUntil, consent.status, c.now);
    if (!step) return [];
    const days = consentDaysLeft(consent.validUntil, c.now);
    const ended = step === "ended";
    return [
      {
        kind: "bank_consent" as const,
        // validUntil in the key: a renewed consent starts its reminders again.
        dedupKey: key(c, "bank_consent", consent.id, consent.validUntil.slice(0, 10), step),
        title: ended ? "Collegamento banca scaduto" : "Collegamento banca in scadenza",
        body: ended
          ? `${consent.bankName}: i movimenti non arrivano più. Collega di nuovo la banca${c.suffix}`
          : `${consent.bankName}: il consenso scade ${days === 1 ? "domani" : `tra ${days} giorni`}. Rinnovalo per non perdere movimenti${c.suffix}`,
        url: "/dati/banche",
      },
    ];
  });
}

export function bankReviewEvents(bank: BankSnapshot, c: Ctx): NotificationEvent[] {
  const { count, latestAt } = bank.openReviews;
  if (!count || !latestAt) return [];
  return [
    {
      kind: "bank_review" as const,
      dedupKey: key(c, "bank_review", latestAt),
      title: "Movimenti da rivedere",
      body: `${count === 1 ? "1 movimento della banca aspetta" : `${count} movimenti della banca aspettano`} una tua decisione${c.suffix}`,
      url: "/dati/banche",
    },
  ];
}
