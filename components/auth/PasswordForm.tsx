"use client";

import { useActionState } from "react";
import { Alert, Button, TextField } from "@monetio/ui";
import { setPassword } from "@/app/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <TextField name="password" type="password" label="Nuova password" autoComplete="new-password" hint="Almeno 8 caratteri" error={state.errors?.password} required />
      <TextField name="confirm" type="password" label="Ripeti la password" autoComplete="new-password" error={state.errors?.confirm} required />
      <Button type="submit" loading={pending} block>
        Salva password
      </Button>
    </form>
  );
}
