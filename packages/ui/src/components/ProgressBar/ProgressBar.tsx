import type { ReactNode } from "react";
import { cx } from "../../utils/cx";
import { formatMoney } from "../../utils/format";
import { messages } from "../../i18n";

export interface ProgressBarProps {
  label: ReactNode;
  /** Spent or saved so far, in cents. */
  valueCents: number;
  /** Budget or goal, in cents. */
  maxCents: number;
  /** "budget": fills toward a limit (warning near, danger over). "goal": fills toward a target. */
  mode?: "budget" | "goal";
  currency?: string;
  hidden?: boolean;
  className?: string;
}

/** Severity of a budget meter from its ratio. */
export function budgetSeverity(ratio: number): "ok" | "warning" | "danger" {
  if (ratio >= 1) return "danger";
  if (ratio >= 0.8) return "warning";
  return "ok";
}

/** Budget or savings-goal meter with its numbers always visible. */
export function ProgressBar({ label, valueCents, maxCents, mode = "budget", currency, hidden, className }: ProgressBarProps) {
  const ratio = maxCents > 0 ? valueCents / maxCents : 0;
  const severity = mode === "goal" ? (ratio >= 1 ? "done" : "goal") : budgetSeverity(ratio);
  const pct = Math.round(ratio * 100);
  const fmt = (c: number) => (hidden ? "••••" : formatMoney(c, { currency, whole: true }));
  const remaining = maxCents - valueCents;
  const note =
    mode === "budget"
      ? remaining >= 0
        ? messages.progress.left(fmt(remaining))
        : messages.progress.over(fmt(-remaining))
      : remaining > 0
        ? messages.progress.toGo(fmt(remaining))
        : messages.progress.reached;

  return (
    <div className={cx("mio-progress", `mio-progress--${severity}`, className)}>
      <div className="mio-progress__head">
        <span className="mio-progress__label">{label}</span>
        <span className="mio-progress__value">
          {fmt(valueCents)} <span className="mio-progress__of">{messages.progress.of} {fmt(maxCents)}</span>
        </span>
      </div>
      <div
        className="mio-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)}
        aria-valuetext={`${pct}%, ${note}`}
      >
        <div className="mio-progress__fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <span className="mio-progress__note">
        {pct}% · {note}
      </span>
    </div>
  );
}
