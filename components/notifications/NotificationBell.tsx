import { countUnreadNotifications } from "@/lib/data/notifications";
import { BellLink } from "./BellLink";

/** Loads the unread count; rendered in the top bar inside Suspense (fallback: bell without badge). */
export async function NotificationBell() {
  return <BellLink unread={await countUnreadNotifications()} />;
}
