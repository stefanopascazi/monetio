import type { Metadata } from "next";
import { Card, EmptyState } from "@monetio/ui";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Esporta" };

export default function ExportPage() {
  return (
    <Card>
      <EmptyState icon={<Download />} title="Esportazione in arrivo" description="Potrai scaricare movimenti, conti e regole del nucleo in un unico file." />
    </Card>
  );
}
