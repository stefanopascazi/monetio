"use client";

import { useActionState } from "react";
import { Alert, Button, Tabs, TextField } from "@monetio/ui";
import { signIn, signUp } from "@/app/actions/auth";

function CredentialsForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? signIn : signUp, {});
  return (
    <form action={action} className="flex flex-col gap-4 pt-4">
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
      <TextField name="email" type="email" label="Email" autoComplete="email" required error={state.errors?.email} />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        hint={mode === "signup" ? "Almeno 8 caratteri" : undefined}
        required
        error={state.errors?.password}
      />
      <Button type="submit" loading={pending} block>
        {mode === "login" ? "Accedi" : "Crea account"}
      </Button>
    </form>
  );
}

export function AuthForms() {
  return (
    <Tabs
      aria-label="Accesso"
      variant="pill"
      tabs={[
        { id: "login", label: "Accedi", content: <CredentialsForm mode="login" /> },
        { id: "signup", label: "Registrati", content: <CredentialsForm mode="signup" /> },
      ]}
    />
  );
}
