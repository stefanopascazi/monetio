import { cx } from "../../utils/cx";
import { type MoneyFormatOptions, formatMoney, splitMoney } from "../../utils/format";
import { messages } from "../../i18n";

export type AmountTone = "auto" | "income" | "expense" | "transfer" | "neutral";

export interface AmountProps extends Pick<MoneyFormatOptions, "currency" | "locale" | "compact"> {
  /** Signed value in integer cents. */
  cents: number;
  /** "auto" colors by sign; "neutral" keeps ink color (balances). */
  tone?: AmountTone;
  size?: "sm" | "md" | "lg" | "xl";
  /** Prefix positive values with +. Defaults to true for income/expense tones. */
  showSign?: boolean;
  /** Masks the value (privacy mode). */
  hidden?: boolean;
  className?: string;
}

/** Every monetary value in the UI renders through Amount: tabular digits, true minus sign, smaller decimals. */
export function Amount({ cents, tone = "auto", size = "md", showSign, hidden, currency, locale, compact, className }: AmountProps) {
  const resolved = tone === "auto" ? (cents > 0 ? "income" : cents < 0 ? "expense" : "neutral") : tone;
  const sign = showSign ?? (tone === "auto" || tone === "income" || tone === "expense");
  const opts: MoneyFormatOptions = { currency, locale, compact, signDisplay: sign ? "always" : "auto" };
  const label = formatMoney(cents, opts);

  if (hidden) {
    return (
      <span className={cx("mio-amount", `mio-amount--${size}`, "mio-amount--hidden", className)} aria-label={messages.amountHidden}>
        ••••••
      </span>
    );
  }

  const { whole, fraction } = splitMoney(cents, opts);
  return (
    <span className={cx("mio-amount", `mio-amount--${size}`, `mio-amount--${resolved}`, className)} aria-label={label}>
      <span aria-hidden="true">
        {whole}
        {fraction && <span className="mio-amount__fraction">{fraction}</span>}
      </span>
    </span>
  );
}
