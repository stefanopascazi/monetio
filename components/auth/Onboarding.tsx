"use client";

import { useActionState } from "react";
import { Alert, Button, Select, Tabs, TextField } from "@monetio/ui";
import { createHousehold, joinHousehold, lookupInvite } from "@/app/actions/household";

function CreateForm() {
  const [state, action, pending] = useActionState(createHousehold, {});
  return (
    <form action={action} className="flex flex-col gap-4 pt-4">
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <TextField name="householdName" label="Nome del nucleo" placeholder="Es. Famiglia Rossi" required />
      <TextField name="displayName" label="Il tuo nome" placeholder="Es. Ste" required />
      <Button type="submit" loading={pending} block>
        Crea il nucleo
      </Button>
    </form>
  );
}

function JoinForm() {
  const [lookup, check, checking] = useActionState(lookupInvite, {});
  const [joined, join, joining] = useActionState(joinHousehold, {});
  if (!lookup.ok) {
    return (
      <form action={check} className="flex flex-col gap-4 pt-4">
        {lookup.message && <Alert tone="danger">{lookup.message}</Alert>}
        <TextField name="code" label="Codice invito" placeholder="Es. 72C88930" hint="Lo trovi in Impostazioni di chi ha creato il nucleo" required />
        <Button type="submit" loading={checking} block>
          Continua
        </Button>
      </form>
    );
  }
  const members = lookup.members ?? [];
  return (
    <form action={join} className="flex flex-col gap-4 pt-4">
      {joined.message && <Alert tone="danger">{joined.message}</Alert>}
      <input type="hidden" name="code" value={lookup.code} />
      {members.length > 0 && (
        <Select
          name="memberId"
          label="Chi sei?"
          defaultValue={members[0].id}
          options={[...members.map((m) => ({ value: m.id, label: m.displayName })), { value: "", label: "Nessuno di questi, sono nuovo" }]}
        />
      )}
      <TextField name="displayName" label="Il tuo nome" optional={members.length > 0} hint={members.length > 0 ? "Serve solo se sei nuovo" : undefined} />
      <Button type="submit" loading={joining} block>
        Unisciti al nucleo
      </Button>
    </form>
  );
}

export function Onboarding() {
  return (
    <Tabs
      aria-label="Nucleo familiare"
      variant="pill"
      tabs={[
        { id: "join", label: "Ho un codice", content: <JoinForm /> },
        { id: "create", label: "Crea nuovo", content: <CreateForm /> },
      ]}
    />
  );
}
