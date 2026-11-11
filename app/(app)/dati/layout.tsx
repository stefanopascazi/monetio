import { Suspense } from "react";
import { PageHeader } from "@monetio/ui";
import { DataNav, DataNavFallback } from "@/components/data/DataNav";

export default function DataLayout({ children }: LayoutProps<"/dati">) {
  return (
    <>
      <PageHeader title="Dati e banche" description="Importa gli estratti conto, rivedi gli import fatti e, presto, collega le banche ed esporta i dati." />
      <Suspense fallback={<DataNavFallback />}>
        <DataNav />
      </Suspense>
      {children}
    </>
  );
}
