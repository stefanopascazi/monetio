import { redirect } from "next/navigation";
import { SETTINGS_HOME } from "@/components/settings/settings-tabs";

// Old single settings page: keep the link working by landing on the first tab.
export default function SettingsPage() {
  redirect(SETTINGS_HOME);
}
