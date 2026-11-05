import { timingSafeEqual } from "node:crypto";

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; reject when the secret is missing. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
