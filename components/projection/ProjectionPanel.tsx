"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Amount, Card, ProjectionChart, type ProjectionPoint, SegmentedControl, Select } from "@monetio/ui";
import { HORIZONS } from "./horizons";

export interface ProjectionSeries {
  id: string;
  name: string;
  points: ProjectionPoint[];
}

/** Projection chart with an account picker; series are computed on the server. */
export function ProjectionPanel({ series, title, subtitle }: { series: ProjectionSeries[]; title: string; subtitle?: string }) {
  const [selected, setSelected] = useState(series[0]?.id ?? "");
  const current = series.find((s) => s.id === selected) ?? series[0];
  if (!current) return null;
  const projected = current.points.filter((p) => p.projected);
  const last = projected.at(-1);
  const min = projected.reduce<ProjectionPoint | null>((m, p) => (!m || p.valueCents < m.valueCents ? p : m), null);

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4">
        {series.length > 1 && (
          <Select label="Conto" value={selected} onChange={(e) => setSelected(e.target.value)} options={series.map((s) => ({ value: s.id, label: s.name }))} className="max-w-xs" />
        )}
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
