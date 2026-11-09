"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { AccountType } from "@monetio/ui";
import { createAccount } from "@/app/actions/accounts";
import { useDragScroll } from "@/hooks/useDragScroll";
import { useScrollEdges } from "@/hooks/useScrollEdges";
import { accountHref, switcherAccounts } from "@/lib/navigation/account-nav";
import { pageStep } from "@/lib/navigation/carousel";
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

const ARROW =
  "hidden size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40 md:inline-flex [&>svg]:size-5";

/**
 * Horizontal row of account cards, rendered by the /conti layout so it survives account switches.
 * The current account comes from the URL; links keep the selected statement period.
 * Desktop: arrows page through the row (they don't change account) and the mouse can drag it.
 */
export function AccountCarousel({ accounts, today }: AccountCarouselProps) {
  const params = useParams<{ id?: string }>();
  const search = useSearchParams();
  const currentId = params.id ?? "";
  const [adding, setAdding] = useState(false);
  const current = useRef<HTMLLIElement>(null);
  const row = useRef<HTMLUListElement>(null);

  useEffect(() => {
    current.current?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [currentId]);

  const sp = Object.fromEntries(search.entries());
  const list = switcherAccounts(accounts, currentId);
  const { atStart, atEnd } = useScrollEdges(row, [list.length]);
  useDragScroll(row);
  const page = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * pageStep(row.current.clientWidth), behavior: "smooth" });

  return (
    <>
      <section aria-label="Cambia conto" className="flex items-center gap-2">
        <ArrowButton label="Scorri indietro" disabled={atStart} onClick={() => page(-1)}>
          <ChevronLeft />
        </ArrowButton>
        <ul
          ref={row}
          className="-my-1 flex min-w-0 flex-1 cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto py-1 select-none [scrollbar-width:none] data-dragging:cursor-grabbing data-dragging:snap-none"
        >
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
        <ArrowButton label="Scorri avanti" disabled={atEnd} onClick={() => page(1)}>
          <ChevronRight />
        </ArrowButton>
      </section>
      {adding && <AccountForm action={createAccount} defaults={{ openingDate: today }} initiallyOpen onClosed={() => setAdding(false)} />}
    </>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={ARROW}>
      {children}
    </button>
  );
}
