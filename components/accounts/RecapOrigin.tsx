import { ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";

/** "Da dove arriva": origin sentence, actual amount note and link to the source. */
export function RecapOrigin({ text, href, note, confirmed }: { text: string; href?: string; note?: string | null; confirmed?: boolean }) {
  return (
    <div aria-label="Da dove arriva" className="flex gap-2 rounded-[16px] bg-surface-raised px-3 py-2.5 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <p>{text}</p>
        {confirmed && <p className="text-ink-muted">Importo o data corretti per questa occorrenza{note ? `: ${note}` : "."}</p>}
        {href && (
          <Link href={href} className="inline-flex w-fit items-center gap-1 font-semibold text-brand-ink underline-offset-2 hover:underline">
            Apri la ricorrenza
            <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
