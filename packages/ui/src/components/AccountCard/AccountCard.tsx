import type { ReactNode } from "react";
import { Banknote, CreditCard, Landmark, Lock, PiggyBank, TrendingUp } from "lucide-react";
import { cx } from "../../utils/cx";
import { formatPercent } from "../../utils/format";
import { Amount } from "../Amount/Amount";
import { AvatarGroup } from "../Avatar/Avatar";
import { messages } from "../../i18n";

export type AccountType = "checking" | "savings" | "investment" | "card" | "cash";

export interface AccountCardProps {
  name: string;
  institution?: string;
  type: AccountType;
  balanceCents: number;
  currency?: string;
  /** Members who can see this account. Empty or one name = private. */
  members?: string[];
  /** Period return in percent (investments) or monthly change. */
  change?: number;
  /** Masked IBAN or card ending, e.g. "•• 4821". */
  reference?: string;
  hidden?: boolean;
  selected?: boolean;
  onClick?: () => void;
  footer?: ReactNode;
  className?: string;
}

const ICONS: Record<AccountType, ReactNode> = {
  checking: <Landmark aria-hidden="true" />,
  savings: <PiggyBank aria-hidden="true" />,
  investment: <TrendingUp aria-hidden="true" />,
  card: <CreditCard aria-hidden="true" />,
  cash: <Banknote aria-hidden="true" />,
};

const TYPE_LABEL: Record<AccountType, string> = messages.accountType;

/** Summary of one account with its balance and who shares it. */
export function AccountCard({
  name,
  institution,
  type,
  balanceCents,
  currency,
  members = [],
  change,
  reference,
  hidden,
  selected,
  onClick,
  footer,
  className,
}: AccountCardProps) {
  const shared = members.length > 1;
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-pressed": selected } : {})}
      className={cx("mio-account", `mio-account--${type}`, onClick && "is-interactive", selected && "is-selected", className)}
    >
      <div className="mio-account__top">
        <span className="mio-account__icon">{ICONS[type]}</span>
        <span className="mio-account__id">
          <span className="mio-account__name">{name}</span>
          <span className="mio-account__meta">{[TYPE_LABEL[type], institution].filter(Boolean).join(" · ")}</span>
        </span>
        {shared ? (
          <AvatarGroup names={members} size="xs" />
        ) : (
          <span className="mio-account__private">
            <Lock aria-hidden="true" />
            {messages.private}
          </span>
        )}
      </div>
      <div className="mio-account__bottom">
        <Amount cents={balanceCents} tone="neutral" size="lg" hidden={hidden} currency={currency} />
        <span className="mio-account__aside">
          {change != null && (
            <span className={cx("mio-account__change", change > 0 && "is-up", change < 0 && "is-down")}>{formatPercent(change)}</span>
          )}
          {reference && <span className="mio-account__ref">{reference}</span>}
        </span>
      </div>
      {footer && <div className="mio-account__footer">{footer}</div>}
    </Tag>
  );
}
