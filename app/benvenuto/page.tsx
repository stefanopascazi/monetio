import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Onboarding } from "@/components/auth/Onboarding";
import { findMembership } from "@/lib/data/context";

export const metadata: Metadata = { title: "Benvenuto" };

export default function WelcomePage() {
  return (
    <AuthCard title="Il tuo nucleo familiare" description="Unisciti al nucleo con il codice invito oppure creane uno nuovo.">
      <Suspense fallback={null}>
        <OnboardingOrHome />
      </Suspense>
    </AuthCard>
  );
}

// Members (including those just linked by email) go straight to the app.
async function OnboardingOrHome() {
  if (await findMembership()) redirect("/");
  return <Onboarding />;
}
