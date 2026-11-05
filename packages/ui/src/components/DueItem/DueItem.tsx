import type { ReactNode } from "react";
import { AlertTriangle, Check, Repeat } from "lucide-react";
import { cx } from "../../utils/cx";
import { DEFAULT_LOCALE, daysUntil, relativeDueLabel } from "../../utils/format";
import { Amount } from "../Amount/Amount";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";

export type Frequency = "weekly" | "monthly" | "bimonthly" | "quarterly" | "yearly" | "once";

export interface DueItemProps {
  title: string;
  dueDate: Date | string;
  /** Expected amount in cents (positive). */
  amountCents: number;
  kind?: "expense" | "income";
  frequency?: Frequency;
  account?: string;
  paid?: boolean;
  /** Reference date for computing days left (defaults to today). */
  today?: Date;
  onMarkPaid?: () => void;
  /** Extra inline action, e.g. "Skip this one". */
  action?: ReactNode;
  hidden?: boolean;
  locale?: string;
  className?: string;
}

const FREQ: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  bimonthly: "Every 2 months",
  quarterly: "Quarterly",
  yearly: "Yearly",
  once: "One-off",
};

/** Due-soon threshold in days. */
export const DUE_SOON_DAYS = 3;

/** Status of a scheduled payment relative to today. */
export function dueStatus(days: number, paid?: boolean): "paid" | "overdue" | "soon" | "upcoming" {
  if (paid) return "paid";
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "soon";
  return "upcoming";
}

/** A recurring or scheduled payment with a calendar-leaf date and inline "Mark as paid". */
export function DueItem({
  title,
  dueDate,
  amountCents,
  kind = "expense",
  frequency = "monthly",
  account,
  paid,
  today,
  onMarkPaid,
  action,
  hidden,
  locale = DEFAULT_LOCALE,
  className,
}: DueItemProps) {
  const date = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const days = daysUntil(date, today);
  const status = dueStatus(days, paid);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date);

  return (
    <div className={cx("mio-due", `mio-due--${status}`, className)}>
      <time className="mio-due__leaf" dateTime={date.toISOString().slice(0, 10)}>
        <span className="mio-due__month">{month}</span>
        <span className="mio-due__day">{date.getDate()}</span>
      </time>
      <div className="mio-due__main">
        <span className="mio-due__title">{title}</span>
        <span className="mio-due__meta">
          <Repeat aria-hidden="true" />
          {[FREQ[frequency], account].filter(Boolean).join(" · ")}
        </span>
        <span className="mio-due__status">
          {status === "paid" && (
            <Badge tone="success" size="sm" icon={<Check aria-hidden="true" />}>
              Paid
            </Badge>
          )}
          {status === "overdue" && (
            <Badge tone="danger" size="sm" icon={<AlertTriangle aria-hidden="true" />}>
              {relativeDueLabel(days)}
            </Badge>
          )}
          {status === "soon" && (
            <Badge tone="warning" size="sm">
              {relativeDueLabel(days)}
            </Badge>
          )}
          {status === "upcoming" && (
            <Badge tone="neutral" size="sm">
              {relativeDueLabel(days)}
            </Badge>
          )}
        </span>
      </div>
      <div className="mio-due__end">
        <Amount cents={kind === "expense" ? -amountCents : amountCents} tone={kind} hidden={hidden} />
        {!paid && (onMarkPaid || action) && (
          <div className="mio-due__actions">
            {action}
            {onMarkPaid && (
              <Button variant="secondary" size="sm" iconStart={<Check aria-hidden="true" />} onClick={onMarkPaid}>
                Mark as paid
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
