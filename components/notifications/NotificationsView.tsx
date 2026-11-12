import { BellOff } from "lucide-react";
import { EmptyState, PageHeader } from "@monetio/ui";
import { listNotifications } from "@/lib/data/notifications";
import { todayISO } from "@/lib/domain/dates";
import { NotificationList } from "./NotificationList";

export async function NotificationsView() {
  // Session read first (inside listNotifications): the render is request-time before today's date.
  const items = await listNotifications();
  const today = todayISO();
  return (
    <>
      <PageHeader title="Notifiche" description="Avvisi degli ultimi 30 giorni" />
      {items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="Nessuna notifica" description="Qui trovi scadenze, rimanenze sotto soglia, conti da aggiornare e stime superate." />
      ) : (
        <NotificationList items={items.map((i) => ({ ...i, createdOn: todayISO(new Date(i.createdAt)) }))} today={today} />
      )}
    </>
  );
}
