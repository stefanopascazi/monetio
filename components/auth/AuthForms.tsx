"use client";

import { useActionState, useState } from "react";
import { Alert, Button, TextField } from "@monetio/ui";
import { requestPasswordReset, signIn } from "@/app/actions/auth";

// Public sign-up is disabled for now: people join by invite from Impostazioni.
// To re-enable it, restore a "Registrati" tab using the `signUp` action in app/actions/auth.ts.

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <TextField name="email" type="email" label="Email" autoComplete="email" required />
      <TextField name="password" type="password" label="Password" autoComplete="current-password" required />
      <Button type="submit" loading={pending} block>
        Accedi
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onForgot}>
        Password dimenticata?
      </Button>
    </form>
  );
}

function ResetForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordReset, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>}
      <TextField name="email" type="email" label="Email" autoComplete="email" hint="Ti inviamo un link per scegliere una nuova password" required />
      <Button type="submit" loading={pending} block>
        Invia link
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        Torna all&apos;accesso
      </Button>
    </form>
  );
}

export function AuthForms() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  return mode === "login" ? <LoginForm onForgot={() => setMode("reset")} /> : <ResetForm onBack={() => setMode("login")} />;
}
