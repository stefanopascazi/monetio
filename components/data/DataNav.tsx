"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@monetio/ui";
import { activeDataTab, DATA_TABS } from "./data-tabs";

function Tabs({ activeId }: { activeId: string }) {
  return (
    <nav aria-label="Sezioni di Dati e banche" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2">
        {DATA_TABS.map((t) => (
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

/** Route tabs of the section. Reads the pathname, so render it inside Suspense. */
export function DataNav() {
  return <Tabs activeId={activeDataTab(usePathname())} />;
}

export function DataNavFallback() {
  return <Tabs activeId="" />;
}
