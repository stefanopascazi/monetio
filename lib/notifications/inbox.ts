// In-app notifications (bell): rows of push_outbox the user can read (RLS hides test rows).
import { daysBetween } from "../domain/dates";

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  /** Same-origin path to open. */
  url: string;
  createdAt: string;
  read: boolean;
}

const SAFE_PATH = /^\/(?!\/)/;

export function mapInboxItem(r: Record<string, unknown>): InboxItem {
  const url = String(r.url ?? "/");
  return {
    id: String(r.id),
    title: String(r.title),
    body: String(r.body ?? ""),
    url: SAFE_PATH.test(url) ? url : "/",
    createdAt: String(r.created_at),
    read: r.read_at != null,
  };
}

/** "Oggi", "Ieri", "3 giorni fa" from two ISO dates (Rome calendar days). */
export function receivedLabel(createdOn: string, today: string): string {
  const days = daysBetween(createdOn, today);
  if (days <= 0) return "Oggi";
  if (days === 1) return "Ieri";
  return `${days} giorni fa`;
}

/** Badge text: hidden at zero, capped at 99+. */
export function unreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
