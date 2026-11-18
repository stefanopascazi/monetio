// Manual diagnostic: shows what the bank returns for each linked account, without writing anything.
import { addDays } from "../../../../lib/domain/dates.ts";
import type { ISODate } from "../../../../lib/domain/types.ts";

export type ProbeClient = { getRaw(path: string): Promise<Record<string, unknown>> };

/** Days read back, wider than a normal sync and with no status filter. */
export const PROBE_DAYS = 365;

/** Response keys, list sizes and the first item of each list. */
export function summarizeResponse(body: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    summary[key] = Array.isArray(value) ? { count: value.length, first: value[0] ?? null } : value;
  }
  return summary;
}

export async function probeBankAccount(uid: string, client: ProbeClient, today: ISODate) {
  const account = `/accounts/${encodeURIComponent(uid)}`;
  const from = addDays(today, -PROBE_DAYS);
  const [details, balances, transactions] = await Promise.all(
    [`${account}/details`, `${account}/balances`, `${account}/transactions?date_from=${from}`].map((path) =>
      client.getRaw(path).then(summarizeResponse, (error: unknown) => ({ error: error instanceof Error ? `${error.message} ${(error as { body?: string }).body ?? ""}`.trim() : String(error) })),
    ),
  );
  return { from, details, balances, transactions };
}
