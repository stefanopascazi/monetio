import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthForms } from "@/components/auth/AuthForms";
import { LinkError } from "@/components/auth/LinkError";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <AuthCard title="Bentornato" description="Accedi per vedere i conti di famiglia.">
      <Suspense fallback={null}>
        <LinkError />
      </Suspense>
      <AuthForms />
    </AuthCard>
  );
}
