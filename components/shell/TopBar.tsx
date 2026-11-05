import { Settings } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@monetio/ui";

/** Wordmark, theme switch and settings link. Static: no session reads. */
export function TopBar() {
  return (
    <header className="flex items-center justify-between gap-3">
      <Link href="/" className="font-display text-xl font-bold tracking-tight">
        monet<span className="text-brand-ink">io</span>
      </Link>
      <div className="flex items-center gap-2">
        <ThemeSwitcher size="sm" />
        <Link
          href="/impostazioni"
          aria-label="Impostazioni"
          className="inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink-muted hover:text-ink"
        >
          <Settings className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
