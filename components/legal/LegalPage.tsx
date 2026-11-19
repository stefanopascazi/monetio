import Link from "next/link";
import type { LegalDocument } from "@/lib/legal/types";
import { LegalSectionBlock } from "./LegalSectionBlock";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Public, session-free page rendering a privacy policy or terms document. */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <Link href="/" className="font-display text-3xl font-bold tracking-tight">
        monet<span className="text-brand-ink">io</span>
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">{doc.title}</h1>
        <p className="text-ink-muted">{doc.intro}</p>
        <p className="text-sm text-ink-muted">
          Ultimo aggiornamento: <time dateTime={doc.updatedAt}>{dateFormat.format(new Date(doc.updatedAt))}</time>
        </p>
      </header>
      <div className="flex flex-col gap-6 rounded-[28px] bg-surface p-6">
        {doc.sections.map((section) => (
          <LegalSectionBlock key={section.title} section={section} />
        ))}
      </div>
      <LegalLinks />
    </main>
  );
}

/** Cross-links between the two public legal pages. */
export function LegalLinks() {
  return (
    <nav aria-label="Note legali" className="flex gap-4 text-sm text-ink-muted">
      <Link href="/privacy" className="underline underline-offset-4">
        Privacy
      </Link>
      <Link href="/terms-of-use" className="underline underline-offset-4">
        Termini del servizio
      </Link>
    </nav>
  );
}
