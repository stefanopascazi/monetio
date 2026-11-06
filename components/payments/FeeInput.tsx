"use client";

import { AmountInput } from "@monetio/ui";
import type { ReactNode } from "react";

/** Optional bonifico/CBill/transfer fee; posts `feeCents` (empty = no fee). */
export function FeeInput({ valueCents, onValueChange, hint, error }: { valueCents: number | null; onValueChange: (c: number | null) => void; hint: ReactNode; error?: ReactNode }) {
  return (
    <>
      <input type="hidden" name="feeCents" value={valueCents ?? ""} />
      <AmountInput label="Spese (facoltative)" kind="expense" valueCents={valueCents} onValueChange={onValueChange} hint={hint} error={error} className="mio-span-full" />
    </>
  );
}
