"use client";

import { useState } from "react";
import { Select, type SelectOption } from "@monetio/ui";
import { linkBankAccount } from "@/app/actions/bank-links";
import { useToastAction } from "@/hooks/useToastAction";

/** Which MonetIO account receives this bank account's balance and movements; saved on change. */
export function BankAccountLinkSelect({ bankAccountId, accountId, options }: { bankAccountId: string; accountId: string | null; options: SelectOption[] }) {
  const [value, setValue] = useState(accountId ?? "");
  const { pending, run } = useToastAction();
  return (
    <Select
      label="Conto MonetIO"
      value={value}
      disabled={pending}
      options={[{ value: "", label: "Non abbinato" }, ...options]}
      onChange={(e) => {
        const next = e.target.value;
        const prev = value;
        setValue(next);
        // Roll back the choice when the server refuses it (e.g. account already fed by another bank account).
        run(async () => {
          const res = await linkBankAccount(bankAccountId, next);
          if (!res.ok) setValue(prev);
          return res;
        });
      }}
    />
  );
}
