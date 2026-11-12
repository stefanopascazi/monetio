"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, cx } from "@monetio/ui";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { useToastAction } from "@/hooks/useToastAction";
import { type InboxItem, receivedLabel } from "@/lib/notifications/inbox";

export interface NotificationListItem extends InboxItem {
  /** Rome calendar date the notification arrived. */
  createdOn: string;
}

/** Inbox rows: opening one marks it read and goes to its page. */
export function NotificationList({ items, today }: { items: NotificationListItem[]; today: string }) {
  const router = useRouter();
  const [opening, start] = useTransition();
  const markAll = useToastAction();
  const unread = items.filter((i) => !i.read).length;

  const open = (item: NotificationListItem) =>
    start(async () => {
      if (!item.read) await markNotificationRead(item.id);
      router.push(item.url);
    });

  return (
    <div className="flex flex-col gap-3">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" iconStart={<CheckCheck />} loading={markAll.pending} onClick={() => markAll.run(markAllNotificationsRead)}>
            Segna tutte come lette
          </Button>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={opening}
              onClick={() => open(item)}
              className={cx(
                "flex w-full items-start gap-3 rounded-[18px] p-4 text-left transition-colors hover:bg-surface-sunken",
                item.read ? "bg-surface" : "bg-surface-raised",
              )}
            >
              <span aria-hidden="true" className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-accent")} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cx("truncate", item.read ? "font-medium text-ink-muted" : "font-semibold text-ink")}>
                    {item.title}
                    {!item.read && <span className="sr-only"> (da leggere)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{receivedLabel(item.createdOn, today)}</span>
                </span>
                <span className="text-sm text-ink-muted">{item.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
