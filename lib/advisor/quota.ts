// Question quota: per user per day (anti-abuse) and per household per month (the plan's allowance).

export interface AdvisorUsage {
  userToday: number;
  householdMonth: number;
}

export interface AdvisorLimits {
  daily: number;
  monthly: number;
}

export interface AdvisorQuota {
  leftToday: number;
  leftMonth: number;
  limits: AdvisorLimits;
}

export const DEFAULT_LIMITS: AdvisorLimits = { daily: 10, monthly: 50 };

/** Positive integer from an env value, or the fallback. */
export function limitFrom(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function advisorQuota(usage: AdvisorUsage, limits: AdvisorLimits): AdvisorQuota {
  return {
    leftToday: Math.max(0, limits.daily - usage.userToday),
    leftMonth: Math.max(0, limits.monthly - usage.householdMonth),
    limits,
  };
}

/** The quota after one more answered question. */
export function afterQuestion(q: AdvisorQuota): AdvisorQuota {
  return { ...q, leftToday: Math.max(0, q.leftToday - 1), leftMonth: Math.max(0, q.leftMonth - 1) };
}

/** Why no question can be asked now (Italian), or null. The monthly allowance wins. */
export function quotaBlock(q: AdvisorQuota): string | null {
  if (q.leftMonth === 0) return `Avete usato le ${q.limits.monthly} domande di questo mese: tornano disponibili dal 1° del mese prossimo.`;
  if (q.leftToday === 0) return `Hai usato le ${q.limits.daily} domande di oggi: riprova domani.`;
  return null;
}

// The daily cap is an anti-abuse guard: mention it only when it is about to bite.
const DAILY_WARNING = 3;

/** Counter shown under the question box (Italian). */
export function quotaLabel(q: AdvisorQuota): string {
  const left = (n: number) => (n === 1 ? "Resta 1 domanda" : `Restano ${n} domande`);
  if (q.leftToday <= DAILY_WARNING && q.leftToday < q.leftMonth) return `${left(q.leftToday)} oggi (${q.leftMonth} questo mese)`;
  return `${left(q.leftMonth)} questo mese`;
}
