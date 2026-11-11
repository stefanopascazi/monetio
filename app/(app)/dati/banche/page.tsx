import type { Metadata } from "next";
import { Card, EmptyState } from "@monetio/ui";
import { Landmark } from "lucide-react";

export const metadata: Metadata = { title: "Banche collegate" };

export default function BanksPage() {
  return (
    <Card>
      <EmptyState
        icon={<Landmark />}
        title="Collegamento alle banche in arrivo"
        description="Potrai collegare i conti in sola lettura e ricevere saldi e movimenti in automatico. Nel frattempo importa gli estratti conto in CSV o XLSX."
      />
    </Card>
  );
}
