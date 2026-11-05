import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordForm } from "@/components/auth/PasswordForm";
import { getUser } from "@/lib/data/context";

export const metadata: Metadata = { title: "Scegli la password" };

export default function PasswordPage() {
  return (
    <AuthCard title="Scegli la password" description="La userai per accedere a MonetIO.">
      <Suspense fallback={null}>
        <SignedInPasswordForm />
      </Suspense>
    </AuthCard>
  );
}

// Requires the session opened by the invite or reset link.
async function SignedInPasswordForm() {
  await getUser();
  return <PasswordForm />;
}
