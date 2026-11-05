"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button, FormPanel, Select, TextField } from "@monetio/ui";
import { inviteMember } from "@/app/actions/members";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";

/** Owner-only: sends an email invite, for a pending member or a new person. */
export function InviteForm({ pending: pendingMembers }: { pending: { id: string; name: string }[] }) {
  const [memberId, setMemberId] = useState(pendingMembers[0]?.id ?? "");
  const [formKey, setFormKey] = useState(0);
  const { state, pending, onSubmit, error } = useFormAction(inviteMember, () => setFormKey((k) => k + 1));
  return (
    <FormPanel
      key={formKey}
      title="Invita una persona"
      description="Riceverà un'email per scegliere la password"
      icon={<UserPlus />}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending}>
          Invia invito
        </Button>
      }
    >
      <FormMessage state={state} />
      <Select
        name="memberId"
        label="Chi"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        options={[...pendingMembers.map((m) => ({ value: m.id, label: `${m.name} (in attesa)` })), { value: "", label: "Una nuova persona" }]}
      />
      {!memberId && <TextField name="displayName" label="Nome" placeholder="Es. Asha" error={error("displayName")} required />}
      <TextField name="email" type="email" label="Email" error={error("email")} required className="mio-span-full" />
    </FormPanel>
  );
}
