import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { Onboarding } from "@/components/auth/Onboarding";

export const metadata: Metadata = { title: "Benvenuto" };

export default function WelcomePage() {
  return (
    <AuthCard title="Il tuo nucleo familiare" description="Unisciti al nucleo con il codice invito oppure creane uno nuovo.">
      <Onboarding />
    </AuthCard>
  );
}
