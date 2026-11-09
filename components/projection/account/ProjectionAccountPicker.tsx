"use client";

import { Select } from "@monetio/ui";
import type { NamedRef } from "@/components/common/options";
import { ALL_ACCOUNTS } from "./account-filter";
import { useProjectionAccount } from "./ProjectionAccountContext";

/** Page-wide account picker driving every projection section. */
export function ProjectionAccountPicker({ accounts }: { accounts: NamedRef[] }) {
  const { selected, setSelected } = useProjectionAccount();
  if (accounts.length < 2) return null;
  return (
    <Select
      label="Conto"
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      options={[{ value: ALL_ACCOUNTS, label: "Tutti i conti" }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
      className="max-w-xs"
    />
  );
}
