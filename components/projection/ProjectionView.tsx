import { Suspense } from "react";
import { PageHeader } from "@monetio/ui";
import { StreamBlock } from "@/components/common/StreamBlock";
import { ReliabilitySection } from "@/components/reliability/ReliabilitySection";
import { AccountPickerSection } from "./account/AccountPickerSection";
import { ProjectionAccountProvider } from "./account/ProjectionAccountContext";
import { horizonParam } from "./horizons";
import { HorizonSwitch } from "./ProjectionPanel";
import { BreakdownSection } from "./sections/BreakdownSection";
import { DetailSection } from "./sections/DetailSection";
import { ProjectionChartSection } from "./sections/ProjectionChartSection";

/** Header and horizon switch show at once; each block streams when its data is ready, filtered by one shared account picker. */
export async function ProjectionView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const horizon = horizonParam((await searchParams).mesi);
  return (
    <ProjectionAccountProvider>
      <PageHeader
        title="Proiezioni"
        description="Saldi previsti a fine mese, calcolati solo da ricorrenze, stime, quote e movimenti pianificati: tienile aggiornate perché la proiezione sia fedele."
        actions={<HorizonSwitch value={horizon} />}
      />
      <Suspense fallback={null}>
        <AccountPickerSection />
      </Suspense>
      <StreamBlock height={360}>
        <ProjectionChartSection horizon={horizon} />
      </StreamBlock>
      <StreamBlock height={200}>
        <ReliabilitySection showAccounts />
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
