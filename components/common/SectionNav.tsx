"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@monetio/ui";
import { activeSectionTab, type SectionTab } from "./section-tabs";

interface SectionNavProps {
  tabs: SectionTab[];
  /** Accessible name, e.g. "Sezioni di Analisi". */
  label: string;
}

function Tabs({ tabs, label, activeId }: SectionNavProps & { activeId: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {tabs.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === activeId ? "page" : undefined}
              className={cx(
                "inline-flex rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap",
                t.id === activeId ? "bg-brand text-on-brand" : "bg-surface-raised text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Route tabs of a section. Reads the pathname, so render it inside Suspense with SectionNavFallback. */
export function SectionNav(props: SectionNavProps) {
  return <Tabs {...props} activeId={activeSectionTab(props.tabs, usePathname())} />;
}

export function SectionNavFallback(props: SectionNavProps) {
  return <Tabs {...props} activeId="" />;
}
