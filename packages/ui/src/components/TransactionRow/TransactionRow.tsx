import type { ReactNode } from "react";
import { Clock, Repeat } from "lucide-react";
import { cx } from "../../utils/cx";
import { formatShortDate } from "../../utils/format";
import { Amount } from "../Amount/Amount";
import { Avatar } from "../Avatar/Avatar";
import { messages } from "../../i18n";

export interface TransactionRowProps {
  payee: string;
  category: string;
  /** Category icon element (lucide icon recommended). */
  categoryIcon: ReactNode;
  /** Categorical color slot 1-6 for the icon tile. */
  categoryColor?: 1 | 2 | 3 | 4 | 5 | 6;
  account?: string;
  date: Date | string;
  /** Signed cents: negative = expense, positive = income. */
  amountCents: number;
  kind?: "expense" | "income" | "transfer";
  /** Household member who recorded it. */
  member?: string;
  recurring?: boolean;
  pending?: boolean;
  hidden?: boolean;
  /** Reference date for year display (pass it from the server to keep prerender stable). */
  today?: Date;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

/** A single movement in a list. Click opens inline detail, never a modal. */
export function TransactionRow({
  payee,
  category,
  categoryIcon,
  categoryColor = 1,
  account,
  date,
  amountCents,
  kind,
  member,
  recurring,
  pending,
  hidden,
  today,
  selected,
  onClick,
  className,
}: TransactionRowProps) {
  const Tag = onClick ? "button" : "div";
  const meta = [category, account, formatShortDate(date, undefined, today)].filter(Boolean).join(" · ");
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": selected } : {})}
      className={cx("mio-txn", onClick && "is-interactive", selected && "is-selected", pending && "is-pending", className)}
    >
      <span className={cx("mio-txn__icon", `mio-txn__icon--c${categoryColor}`)} aria-hidden="true">
        {categoryIcon}
      </span>
      <span className="mio-txn__main">
        <span className="mio-txn__payee">
          {payee}
          {recurring && <Repeat className="mio-txn__flag" aria-label={messages.recurring} />}
          {pending && <Clock className="mio-txn__flag" aria-label={messages.pending} />}
        </span>
        <span className="mio-txn__meta">{meta}</span>
      </span>
      <span className="mio-txn__end">
        <Amount cents={amountCents} tone={kind ?? "auto"} hidden={hidden} showSign={kind !== "transfer"} />
        {member && <Avatar name={member} size="xs" />}
      </span>
    </Tag>
  );
}
