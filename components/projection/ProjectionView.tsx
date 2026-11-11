import { Suspense } from "react";
import { StreamBlock } from "@/components/common/StreamBlock";
import { AccountPickerSection } from "./account/AccountPickerSection";
import { ProjectionAccountProvider } from "./account/ProjectionAccountContext";
import { horizonParam } from "./horizons";
import { HorizonSwitch } from "./ProjectionPanel";
import { BreakdownSection } from "./sections/BreakdownSection";
import { DetailSection } from "./sections/DetailSection";
import { ProjectionChartSection } from "./sections/ProjectionChartSection";

/** Intro and horizon switch show at once (the page title comes from the Analisi layout); each block streams when its data is ready, filtered by one shared account picker. */
export async function ProjectionView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const horizon = horizonParam((await searchParams).mesi);
  return (
    <ProjectionAccountProvider>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-muted">
          Saldi previsti a fine mese, calcolati solo da ricorrenze, stime, quote e movimenti pianificati: tienile aggiornate perché la proiezione sia fedele.
        </p>
        <HorizonSwitch value={horizon} />
      </div>
      <Suspense fallback={null}>
        <AccountPickerSection />
      </Suspense>
      <StreamBlock height={360}>
        <ProjectionChartSection horizon={horizon} />
      </StreamBlock>
      <StreamBlock height={240}>
        <BreakdownSection horizon={horizon} />
      </StreamBlock>
      <StreamBlock height={320}>
        <DetailSection horizon={horizon} />
      </StreamBlock>
    </ProjectionAccountProvider>
  );
}
