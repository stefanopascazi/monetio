"use client";

import { LogOut, Pencil, Trash2 } from "lucide-react";
import { Button, FormPanel, InlineConfirm, TextField } from "@monetio/ui";
import { deleteHousehold, leaveHousehold, renameHousehold } from "@/app/actions/household";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
import { useToastAction } from "@/hooks/useToastAction";

/** Admins only: renames the active household. */
export function RenameHouseholdForm({ householdName }: { householdName: string }) {
  const { state, pending, onSubmit, error } = useFormAction(renameHousehold);
  return (
    <FormPanel title="Rinomina nucleo" icon={<Pencil />} defaultOpen={false} onSubmit={onSubmit} actions={<Button type="submit" loading={pending}>Salva</Button>}>
      <FormMessage state={state} />
      <TextField name="householdName" label="Nome del nucleo" defaultValue={householdName} error={error("householdName")} required className="mio-span-full" />
    </FormPanel>
  );
}

/** Leave (anyone but the last admin) and delete (admins) the active household, with inline confirmation. */
export function HouseholdExit({ householdName, admin, canLeave }: { householdName: string; admin: boolean; canLeave: boolean }) {
  const { run } = useToastAction();
  return (
    <div className="flex flex-wrap gap-2">
      {canLeave && (
        <InlineConfirm
          triggerLabel="Esci dal nucleo"
          triggerIcon={<LogOut />}
          message={`Esco da "${householdName}"? Per rientrare servirà un nuovo invito.`}
          confirmLabel="Esci"
          onConfirm={() => run(() => leaveHousehold())}
        />
      )}
      {admin && (
        <InlineConfirm
          triggerLabel="Elimina nucleo"
          triggerIcon={<Trash2 />}
          message={`Elimino "${householdName}" con tutti i conti e i movimenti? Non si può annullare.`}
          confirmLabel="Elimina"
          onConfirm={() => run(() => deleteHousehold())}
        />
      )}
    </div>
  );
}
