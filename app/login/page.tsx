import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForms } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <AuthCard title="Bentornato" description="Accedi per vedere i conti di famiglia.">
      <AuthForms />
    </AuthCard>
  );
}
