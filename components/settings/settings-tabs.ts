// Tabs of "Impostazioni": who I am, the household I share, and how the app behaves on this device (#73).
import type { SectionTab } from "@/components/common/section-tabs";

export const SETTINGS_TABS: SectionTab[] = [
  { id: "account", label: "Account", href: "/impostazioni/account" },
  { id: "nucleo", label: "Nucleo", href: "/impostazioni/nucleo" },
  { id: "app", label: "App", href: "/impostazioni/app" },
];

/** Landing tab: the personal area link in the top bar points here. */
export const SETTINGS_HOME = SETTINGS_TABS[0].href;
