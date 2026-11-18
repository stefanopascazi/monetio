"use client";

import { SectionNav, SectionNavFallback } from "@/components/common/SectionNav";
import { SETTINGS_TABS } from "./settings-tabs";

const LABEL = "Sezioni di Impostazioni";

export function SettingsNav() {
  return <SectionNav tabs={SETTINGS_TABS} label={LABEL} />;
}

export function SettingsNavFallback() {
  return <SectionNavFallback tabs={SETTINGS_TABS} label={LABEL} />;
}
