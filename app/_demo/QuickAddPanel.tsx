"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  AmountInput,
  Button,
  FormPanel,
  SegmentedControl,
  Select,
  TextField,
  type AmountKind,
  type Visibility,
  VisibilityPicker,
} from "@monetio/ui";
import { members } from "./demo-data";

/** Inline "add transaction" form: the modal-free pattern for data entry. */
export function QuickAddPanel() {
  const [kind, setKind] = useState<AmountKind>("expense");
  const [amount, setAmount] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<Visibility>({ mode: "household", memberIds: [] });

  return (
    <FormPanel
      title="Add transaction"
      description="Expense, income or transfer between accounts"
      icon={<Plus />}
      defaultOpen
      actions={
        <>
          <Button variant="ghost">Cancel</Button>
          <Button type="submit" disabled={!amount}>
            Save transaction
          </Button>
        </>
      }
    >
      <SegmentedControl<AmountKind>
        aria-label="Transaction type"
        className="mio-span-full"
        block
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: "Expense", tone: "expense" },
          { value: "income", label: "Income", tone: "income" },
          { value: "transfer", label: "Transfer", tone: "transfer" },
        ]}
      />
      <AmountInput label="Amount" kind={kind} valueCents={amount} onValueChange={setAmount} className="mio-span-full" />
      <TextField label="Payee" placeholder="e.g. Esselunga" />
      <Select
        label="Account"
        defaultValue="joint"
        options={[
          { value: "joint", label: "Joint account · Intesa" },
          { value: "personal", label: "Personal · Fineco" },
          { value: "card", label: "Credit card · Amex" },
        ]}
      />
      <TextField label="Date" type="date" defaultValue="2026-11-05" />
      <VisibilityPicker members={members} ownerId="g" value={visibility} onChange={setVisibility} className="mio-span-full" />
    </FormPanel>
  );
}
