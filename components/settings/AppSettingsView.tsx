import { Card, ThemeSwitcher } from "@monetio/ui";
import { getNotificationPrefs } from "@/lib/data/notifications";
import { listAccounts } from "@/lib/data/queries";
import { NotificationPrefsForm } from "./NotificationPrefsForm";
import { NotificationsCard } from "./NotificationsCard";

/** Impostazioni > App: personal preferences (theme, notifications). */
export async function AppSettingsView() {
  const [accounts, prefs] = await Promise.all([listAccounts(), getNotificationPrefs()]);
  const watchable = accounts.filter((a) => !a.archived && a.type !== "card").map(({ id, name }) => ({ id, name }));
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <Card title="Aspetto">
        <ThemeSwitcher showLabels />
      </Card>
      <NotificationsCard>
        <NotificationPrefsForm prefs={prefs} accounts={watchable} />
      </NotificationsCard>
    </section>
  );
}
