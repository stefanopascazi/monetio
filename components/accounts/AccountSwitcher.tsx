"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Amount } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { BALANCES_CLASS } from "@/lib/privacy/balance-privacy";
import { AccountForm } from "./AccountForm";

export interface SwitcherItem {
  id: string;
  name: string;
  balanceCents: number;
  href: string;
}

export interface AccountSwitcherProps {
  items: SwitcherItem[];
  currentId: string;
  prevHref?: string | null;
  nextHref?: string | null;
  /** Default opening date for the new account form. */
  today: string;
}

const ARROW = "hidden size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink md:inline-flex [&>svg]:size-5";

/**
 * Sticky row of account chips under the top bar: tap to switch, "+" opens the new account form inline.
 * Desktop adds prev/next arrows; the current chip is scrolled into view.
 */
export function AccountSwitcher({ items, currentId, prevHref, nextHref, today }: AccountSwitcherProps) {
  const [adding, setAdding] = useState(false);
  const active = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    active.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [currentId]);

  return (
    // Fragment: the nav must be a direct child of the page column for `sticky` to span the whole page.
    <>
      <nav
        aria-label="Cambia conto"
        className="sticky top-[calc(max(1.5rem,env(safe-area-inset-top))+3.25rem)] z-20 -mx-4 flex items-center gap-2 bg-bg px-4 py-2"
      >
        <ArrowLink href={prevHref} label="Conto precedente">
          <ChevronLeft />
        </ArrowLink>
        <ul className={`flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto [scrollbar-width:none] ${BALANCES_CLASS}`}>
          {items.map((a) => {
            const current = a.id === currentId;
            return (
              <li key={a.id} className="shrink-0 snap-start">
                <Link
                  ref={current ? active : undefined}
                  href={a.href}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={`mio-chip ${current ? "is-selected" : ""}`}
                >
                  <span className="max-w-40 truncate">{a.name}</span>
                  <Amount cents={a.balanceCents} tone="neutral" size="sm" className="opacity-80" />
                </Link>
              </li>
            );
          })}
          <li className="shrink-0">
            <button type="button" className={`mio-chip ${adding ? "is-selected" : ""}`} aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
              <Plus aria-hidden="true" />
              <span>Nuovo</span>
            </button>
          </li>
        </ul>
        <ArrowLink href={nextHref} label="Conto successivo">
          <ChevronRight />
        </ArrowLink>
      </nav>
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
