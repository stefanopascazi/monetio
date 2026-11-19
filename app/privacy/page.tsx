import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_POLICY } from "@/lib/legal/privacy";

export const metadata: Metadata = { title: "Privacy", description: PRIVACY_POLICY.intro };

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY_POLICY} />;
}
