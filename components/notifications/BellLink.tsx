import { Bell } from "lucide-react";
import Link from "next/link";
import { unreadBadge } from "@/lib/notifications/inbox";

/** Top bar bell: links to /notifiche, with the unread count (hidden at zero). */
export function BellLink({ unread }: { unread: number }) {
  const badge = unreadBadge(unread);
  return (
    <Link
      href="/notifiche"
      aria-label={badge ? `Notifiche, ${unread} da leggere` : "Notifiche"}
      className="relative inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink"
    >
      <Bell className="size-5" aria-hidden="true" />
      {badge && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] leading-5 font-bold text-on-accent"
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
