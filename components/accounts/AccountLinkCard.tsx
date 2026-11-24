import Link from "next/link";
import { AccountCard, type AccountType } from "@monetio/ui";
import { BALANCES_CLASS } from "@/lib/privacy/balance-privacy";
import type { AccountBankBalances } from "@/lib/banking/connections";
import { BankBalancesNote } from "./BankBalancesNote";
import { MonthEndNote } from "./MonthEndNote";

export interface AccountLinkCardProps {
  href: string;
  name: string;
  institution?: string | null;
  type: AccountType;
  balanceCents: number;
  members: string[];
  /** Expected month-end balance; omitted when unknown (archived). */
  monthEndCents?: number;
  /** Booked and available balance from the linked bank, when it gives an available one. */
  bank?: AccountBankBalances;
  /** Highlights the card and marks the link as the current page. */
  current?: boolean;
  /** False keeps the scroll position (switching inside the accounts section). */
  scroll?: boolean;
}

/** Account card linking to its statement; shared by the home grid and the accounts carousel. */
export function AccountLinkCard({ href, name, institution, type, balanceCents, members, monthEndCents, bank, current, scroll = true }: AccountLinkCardProps) {
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-current={current ? "page" : undefined}
      className="block rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <AccountCard
        name={name}
        institution={institution ?? undefined}
        type={type}
        balanceCents={balanceCents}
        members={members}
        selected={current}
        className={BALANCES_CLASS}
        footer={
          bank || monthEndCents !== undefined ? (
            <span className="flex flex-col gap-2">
              <BankBalancesNote bank={bank} />
              <MonthEndNote cents={monthEndCents} />
            </span>
          ) : undefined
        }
      />
    </Link>
  );
}
