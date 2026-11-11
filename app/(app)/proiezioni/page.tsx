import { redirect } from "next/navigation";
import { withQuery } from "@/lib/data/params";

// Old address: Proiezioni moved under Analisi; the horizon param is kept.
export default async function LegacyProjectionPage({ searchParams }: PageProps<"/proiezioni">) {
  const { mesi } = await searchParams;
  redirect(withQuery("/analisi/proiezioni", { mesi: typeof mesi === "string" ? mesi : undefined }));
}
