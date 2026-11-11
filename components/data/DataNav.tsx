"use client";

import { SectionNav, SectionNavFallback } from "@/components/common/SectionNav";
import { DATA_TABS } from "./data-tabs";

const LABEL = "Sezioni di Dati e banche";

export function DataNav() {
  return <SectionNav tabs={DATA_TABS} label={LABEL} />;
}

export function DataNavFallback() {
  return <SectionNavFallback tabs={DATA_TABS} label={LABEL} />;
}
