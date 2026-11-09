"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { AccountType } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { accountHref, adjacentAccounts, switcherAccounts } from "@/lib/navigation/account-nav";
import { AccountForm } from "./AccountForm";
import { AccountLinkCard } from "./AccountLinkCard";

export interface CarouselAccount {
  id: string;
  name: string;
  institution: string | null;
  type: AccountType;
  balanceCents: number;
  members: string[];
  archived: boolean;
  monthEndCents?: number;
}

export interface AccountCarouselProps {
  accounts: CarouselAccount[];
  /** Default opening date for the new account form. */
  today: string;
}

const ARROW = "hidden size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink md:inline-flex [&>svg]:size-5";

/**
 * Horizontal row of account cards, rendered by the /conti layout so it survives account switches.
 * The current account comes from the URL; links keep the selected statement period.
 */
export function AccountCarousel({ accounts, today }: AccountCarouselProps) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const currentId = params.id ?? "";
  const [adding, setAdding] = useState(false);
  const current = useRef<HTMLLIElement>(null);

  useEffect(() => {
    current.current?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentId]);

  const sp = Object.fromEntries(search.entries());
  const list = switcherAccounts(accounts, currentId);
  const { prev, next } = adjacentAccounts(list, currentId);

  return (
    <>
      <section aria-label="Cambia conto" className="flex items-center gap-2">
        <ArrowLink href={prev && accountHref(prev.id, sp)} label="Conto precedente">
          <ChevronLeft />
        </ArrowLink>
        <ul className="-my-1 flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto py-1 [scrollbar-width:none]">
          {list.map((a) => {
            const isCurrent = a.id === currentId;
            return (
              <li key={a.id} ref={isCurrent ? current : undefined} className="w-[min(18rem,82vw)] shrink-0 snap-start p-0.5">
                <AccountLinkCard
                  href={accountHref(a.id, sp)}
                  name={a.name}
                  institution={a.institution}
                  type={a.type}
                  balanceCents={a.balanceCents}
                  members={a.members}
                  monthEndCents={a.monthEndCents}
                  current={isCurrent}
                  scroll={false}
                />
              </li>
            );
          })}
          <li className="w-40 shrink-0 snap-start p-0.5">
            <button
              type="button"
              aria-expanded={adding}
              onClick={() => setAdding((v) => !v)}
              className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[28px] border-2 border-dashed border-border p-4 text-ink-muted hover:text-ink aria-expanded:border-ink aria-expanded:text-ink"
            >
              <Plus aria-hidden="true" className="size-6" />
              <span className="font-semibold">Nuovo conto</span>
            </button>
          </li>
        </ul>
        <ArrowLink href={next && accountHref(next.id, sp)} label="Conto successivo">
          <ChevronRight />
        </ArrowLink>
      </section>
      {adding && <AccountForm action={createAccount} defaults={{ openingDate: today }} initiallyOpen onClosed={() => setAdding(false)} />}
    </>
  );
}

function ArrowLink({ href, label, children }: { href?: string | null; label: string; children: ReactNode }) {
  if (!href) {
    return (
      <span aria-hidden="true" className={`${ARROW} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={ARROW}>
      {children}
    </Link>
  );
}
