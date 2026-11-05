import { ArrowUpRight } from "lucide-react";
import { Amount, Sparkline, StatTile } from "@monetio/ui";
import { projection } from "./demo-data";

/** Greeting, net worth and the two numbers of the month. */
export function DemoHero() {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-surface p-6">
        <div>
          <p className="text-ink-muted">Hi Giulia, here is the Rossi household in November.</p>
          <p className="mt-1 text-sm text-ink-subtle">Sample data</p>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink-muted">Net worth</span>
            <Amount cents={4821035} tone="neutral" size="xl" />
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand px-3 py-1 text-sm font-semibold text-on-brand">
              <ArrowUpRight className="size-4" aria-hidden="true" />
              +9.4% since October
            </span>
          </div>
          <Sparkline data={projection.slice(0, 6).map((p) => p.valueCents)} width={180} height={64} aria-label="Net worth rising over 6 months" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
        <StatTile tone="mint" label="Came in" valueCents={431000} delta={1.2} deltaLabel="vs Oct" />
        <StatTile tone="coral" label="Went out" valueCents={214000} delta={-32.7} deltaLabel="vs Oct" upIsGood={false} />
      </div>
    </section>
  );
}
