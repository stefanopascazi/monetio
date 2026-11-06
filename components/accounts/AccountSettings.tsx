"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useState } from "react";
import { Accordion, Button } from "@monetio/ui";
import { setAccountArchived, updateAccount } from "@/app/actions/accounts";
import { useToastAction } from "@/hooks/useToastAction";
import type { AccountWithBalance } from "@/lib/data/queries";
import { AccountForm } from "./AccountForm";

export function AccountSettings({ account, canMakePrivate }: { account: AccountWithBalance; canMakePrivate: boolean }) {
  const [open, setOpen] = useState<string[]>([]);
  const { pending, run } = useToastAction();
  const close = () => setOpen([]);
  return (
    <Accordion
      value={open}
      onValueChange={setOpen}
      items={[
        {
          id: "settings",
          title: "Impostazioni del conto",
          content: (
            <div className="flex flex-col gap-4 pb-2">
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
          ),
        },
      ]}
    />
  );
}
