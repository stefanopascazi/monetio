"use client";

import { SectionNav, SectionNavFallback } from "@/components/common/SectionNav";
import { ANALYSIS_TABS } from "./analysis-tabs";

const LABEL = "Sezioni di Analisi";

export function AnalysisNav() {
  return <SectionNav tabs={ANALYSIS_TABS} label={LABEL} />;
}

export function AnalysisNavFallback() {
  return <SectionNavFallback tabs={ANALYSIS_TABS} label={LABEL} />;
}
