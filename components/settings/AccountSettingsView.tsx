import { getContext } from "@/lib/data/context";
import { SessionCard } from "./SessionCard";
import { ProfileForm } from "./SettingsForms";

/** Impostazioni > Account: own name in the household and the session. */
export async function AccountSettingsView() {
  const ctx = await getContext();
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <ProfileForm displayName={ctx.me.displayName} />
      <SessionCard email={ctx.email} />
    </section>
  );
}
