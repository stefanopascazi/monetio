import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordGate } from "@/components/auth/PasswordGate";

export const metadata: Metadata = { title: "Scegli la password" };

// The session is opened client-side from the email link (tokens may arrive in the URL fragment).
export default function PasswordPage() {
  return (
    <AuthCard title="Scegli la password" description="La userai per accedere a MonetIO.">
      <PasswordGate />
    </AuthCard>
  );
}
