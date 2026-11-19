"use client";

import { useState } from "react";
import { Button, Select, type SelectOption } from "@monetio/ui";
import { linkBankAccount } from "@/app/actions/bank-links";
import { useToastAction } from "@/hooks/useToastAction";

type Props = { bankAccountId: string; accountId: string | null; options: SelectOption[] };

/** Which MonetIO account receives this bank account's balance and movements; saved with the button. */
export function BankAccountLinkSelect({ bankAccountId, accountId, options }: Props) {
  const [saved, setSaved] = useState(accountId ?? "");
  const [value, setValue] = useState(saved);
  const { pending, run } = useToastAction();
  // The server may refuse (e.g. account already fed by another bank account): the choice stays editable.
  const save = () => run(() => linkBankAccount(bankAccountId, value), () => setSaved(value));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Select
        label="Conto MonetIO"
        className="sm:flex-1"
        value={value}
        disabled={pending}
        options={[{ value: "", label: "Non abbinato" }, ...options]}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button variant="secondary" loading={pending} disabled={value === saved} onClick={save}>
        Salva
      </Button>
    </div>
  );
}
