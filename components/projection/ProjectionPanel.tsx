"use client";

import { useRouter } from "next/navigation";
import { Amount, Card, ProjectionChart, type ProjectionPoint, SegmentedControl } from "@monetio/ui";
import { ReliabilityNote } from "@/components/reliability/ReliabilityNote";
import type { ReliabilityData } from "@/components/reliability/reliability-view";
import { useProjectionAccount } from "./account/ProjectionAccountContext";
import { HORIZONS } from "./horizons";

export interface ProjectionSeries {
  id: string;
  name: string;
  points: ProjectionPoint[];
}

/** Projection chart for the page-wide account selection; series are computed on the server. */
export function ProjectionPanel({ series, title, subtitle, reliability }: { series: ProjectionSeries[]; title: string; subtitle?: string; reliability?: ReliabilityData }) {
  const { selected } = useProjectionAccount();
  const current = series.find((s) => s.id === selected) ?? series[0];
  if (!current) return null;
  const projected = current.points.filter((p) => p.projected);
  const last = projected.at(-1);
  const min = projected.reduce<ProjectionPoint | null>((m, p) => (!m || p.valueCents < m.valueCents ? p : m), null);

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4">
        {reliability && <ReliabilityNote data={reliability} seriesId={current.id} />}
        <ProjectionChart data={current.points} title={`Proiezione ${current.name}`} />
        <div className="grid grid-cols-2 gap-4">
          {last && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">A fine periodo ({last.label})</span>
              <Amount cents={last.valueCents} tone="neutral" size="lg" />
            </div>
          )}
          {min && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Punto più basso ({min.label})</span>
              <Amount cents={min.valueCents} tone={min.valueCents < 0 ? "expense" : "neutral"} size="lg" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Horizon switch that updates the `?mesi=` search param. */
export function HorizonSwitch({ value }: { value: string }) {
  const router = useRouter();
  return (
    <SegmentedControl<string>
      aria-label="Orizzonte"
      size="sm"
      value={value}
      onChange={(v) => router.push(`?mesi=${v}`, { scroll: false })}
      options={HORIZONS.map((h) => ({ value: h.value, label: h.label }))}
    />
  );
}
