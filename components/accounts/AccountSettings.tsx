"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useState, useTransition } from "react";
import { Accordion, Alert, Button } from "@monetio/ui";
import { setAccountArchived, updateAccount } from "@/app/actions/accounts";
import type { ActionState } from "@/app/actions/state";
import type { AccountWithBalance } from "@/lib/data/queries";
import { AccountForm } from "./AccountForm";

export function AccountSettings({ account, canMakePrivate }: { account: AccountWithBalance; canMakePrivate: boolean }) {
  const [result, setResult] = useState<ActionState | null>(null);
  const [pending, start] = useTransition();
  return (
    <Accordion
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
                defaults={{
                  name: account.name,
                  institution: account.institution,
                  type: account.type,
                  visibility: account.visibility,
                  openingBalanceCents: account.openingBalanceCents,
                  openingDate: account.openingDate,
                }}
              />
              {result?.message && <Alert tone={result.ok ? "success" : "danger"}>{result.message}</Alert>}
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                loading={pending}
                iconStart={account.archived ? <ArchiveRestore /> : <Archive />}
                onClick={() => start(async () => setResult(await setAccountArchived(account.id, !account.archived)))}
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
