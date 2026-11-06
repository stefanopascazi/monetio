"use client";

import { useState } from "react";
import { Select, TextField } from "@monetio/ui";
import { enumOptions, FREQUENCY_LABEL } from "@/components/common/options";
import { anchorDay, firstOccurrence } from "@/lib/domain/recurrence";
import type { ISODate, RecurringRule, RuleFrequency } from "@/lib/domain/types";
import { recurrenceSummary } from "./recurrence-summary";

export interface RuleScheduleFieldsProps {
  rule?: RecurringRule;
  today: ISODate;
  error: (field: string) => string | undefined;
}

/**
 * Frequency + timing fields. Monthly rules pick a day of month; every other frequency
 * picks its first due date, which fixes both the month and the day of the cycle.
 */
export function RuleScheduleFields({ rule, today, error }: RuleScheduleFieldsProps) {
  const [frequency, setFrequency] = useState<RuleFrequency>(rule?.frequency ?? "monthly");
  // Existing non-monthly rules show their actual first due date rather than the raw start date.
  const [startDate, setStartDate] = useState<ISODate>(() => (rule && rule.frequency !== "monthly" ? (firstOccurrence(rule) ?? rule.startDate) : (rule?.startDate ?? today)));
  const monthly = frequency === "monthly";
  const keptDay = rule?.dayOfMonth ?? 1;
  const summary = monthly ? "" : recurrenceSummary(frequency, startDate, startDate ? anchorDay(startDate, keptDay) : undefined);

  return (
    <>
      <Select
        name="frequency"
        label="Frequenza"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value as RuleFrequency)}
        options={enumOptions(FREQUENCY_LABEL)}
        error={error("frequency")}
      />
      {monthly ? (
        <TextField name="dayOfMonth" label="Giorno del mese" type="number" min={1} max={31} defaultValue={keptDay} error={error("dayOfMonth")} />
      ) : (
        // Day is derived server-side from the first due date; the stored day keeps a month-end intent.
        <input type="hidden" name="dayOfMonth" value={keptDay} />
      )}
      <TextField
        name="startDate"
        label={monthly ? "Dal" : "Prima scadenza"}
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        error={error("startDate")}
        hint={monthly ? undefined : summary || "Scegli il giorno della prima scadenza: fissa mese e giorno delle successive"}
        required
      />
    </>
  );
}
