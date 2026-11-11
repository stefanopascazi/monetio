import { Suspense } from "react";
import { PageHeader } from "@monetio/ui";
import { AnalysisNav, AnalysisNavFallback } from "@/components/analysis/AnalysisNav";

export default function AnalysisLayout({ children }: LayoutProps<"/analisi">) {
  return (
    <>
      <PageHeader title="Analisi" description="Statistiche per capire dove vanno i soldi, proiezioni per vedere dove state andando." />
      <Suspense fallback={<AnalysisNavFallback />}>
        <AnalysisNav />
      </Suspense>
      {children}
    </>
  );
}
