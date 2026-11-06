"use client";

import { Archive, ArchiveRestore, Settings } from "lucide-react";
import { useState } from "react";
import { Button, Modal } from "@monetio/ui";
import { setAccountArchived, updateAccount } from "@/app/actions/accounts";
import { useToastAction } from "@/hooks/useToastAction";
import type { AccountWithBalance } from "@/lib/data/queries";
import { AccountForm } from "./AccountForm";

/** Gear button opening the account settings in a modal (explicit exception to the modal-free rule). */
export function AccountSettings({ account, canMakePrivate }: { account: AccountWithBalance; canMakePrivate: boolean }) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useToastAction();
  const close = () => setOpen(false);
  return (
    <>
      <Button variant="ghost" iconOnly iconStart={<Settings />} aria-label="Impostazioni del conto" onClick={() => setOpen(true)} />
      <Modal open={open} onOpenChange={setOpen} title="Impostazioni del conto" description={account.name}>
        <div className="flex flex-col gap-6">
          <AccountForm
            embedded
            canMakePrivate={canMakePrivate}
            action={updateAccount.bind(null, account.id)}
            onSaved={close}
            defaults={{
              name: account.name,
              institution: account.institution,
              type: account.type,
              visibility: account.visibility,
              openingBalanceCents: account.openingBalanceCents,
              openingDate: account.openingDate,
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="w-fit"
            loading={pending}
            iconStart={account.archived ? <ArchiveRestore /> : <Archive />}
            onClick={() => run(() => setAccountArchived(account.id, !account.archived), close)}
          >
            {account.archived ? "Ripristina conto" : "Archivia conto"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
