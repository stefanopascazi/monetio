"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";
import { cx } from "../../utils/cx";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE, parseMoneyInput } from "../../utils/format";
import { Field, describedBy } from "../Field/Field";

export type AmountKind = "expense" | "income" | "transfer" | "neutral";

export interface AmountInputProps {
  label: ReactNode;
  /** Value in integer cents (always positive; `kind` gives the sign). */
  valueCents: number | null;
  onValueChange: (cents: number | null) => void;
  kind?: AmountKind;
  currency?: string;
  locale?: string;
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  className?: string;
}

const SIGN: Record<AmountKind, string> = { expense: "−", income: "+", transfer: "⇄", neutral: "" };

function toText(cents: number | null, locale: string) {
  if (cents == null) return "";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

/** Large ledger-style amount field. Parses free input on blur into cents. */
export function AmountInput({
  label,
  valueCents,
  onValueChange,
  kind = "neutral",
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
  hint,
  error,
  id,
  name,
  autoFocus,
  className,
}: AmountInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  // Raw text while the user is typing; null when idle, so the field shows the formatted prop value.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? toText(valueCents, locale);

  const symbol =
    new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")
      ?.value ?? currency;

  return (
    <Field label={label} htmlFor={inputId} hint={hint} error={error} className={className}>
      <div className={cx("mio-control", "mio-amount-input", `mio-amount-input--${kind}`)}>
        {SIGN[kind] && (
          <span className="mio-amount-input__sign" aria-hidden="true">
            {SIGN[kind]}
          </span>
        )}
        <span className="mio-amount-input__currency">{symbol}</span>
        <input
          id={inputId}
          name={name}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0.00"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          onFocus={() => setDraft(text)}
          onChange={(e) => {
            setDraft(e.target.value);
            onValueChange(parseMoneyInput(e.target.value));
          }}
          onBlur={() => {
            const cents = parseMoneyInput(text);
            setDraft(null);
            onValueChange(cents == null ? null : Math.abs(cents));
          }}
        />
      </div>
    </Field>
  );
}
