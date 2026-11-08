"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, InlineConfirm } from "@monetio/ui";
import { closeEstimate } from "@/app/actions/estimates";
import { useToastAction } from "@/hooks/useToastAction";
import { EstimateBookForm } from "./EstimateBookForm";

export interface EstimateActionsProps {
  refKey: string;
  amountCents: number;
  today: string;
}

/** What is left of an estimate: book it as a movement (amount editable) or drop it for the period. */
export function EstimateActions({ refKey, amountCents, today }: EstimateActionsProps) {
  const [booking, setBooking] = useState(false);
  const { run } = useToastAction();
  if (booking) return <EstimateBookForm refKey={refKey} amountCents={amountCents} today={today} onClose={() => setBooking(false)} />;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="sm" iconStart={<Check />} onClick={() => setBooking(true)}>
        Registra movimento
      </Button>
      <InlineConfirm
        triggerLabel="Elimina stima"
        triggerIcon={<Trash2 />}
        message="Elimino quanto resta della stima per questo periodo?"
        confirmLabel="Elimina"
        onConfirm={() => run(() => closeEstimate(refKey))}
      />
    </div>
  );
}
