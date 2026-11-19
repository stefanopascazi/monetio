import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_OF_USE } from "@/lib/legal/terms";

export const metadata: Metadata = { title: "Termini del servizio", description: TERMS_OF_USE.intro };

export default function TermsOfUsePage() {
  return <LegalPage doc={TERMS_OF_USE} />;
}
