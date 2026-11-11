import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Badge, type BadgeTone, Card } from "@monetio/ui";
import { LEVEL_LABEL, type Reliability, type ReliabilityLevel } from "@/lib/domain/reliability";

const TONE: Record<ReliabilityLevel, BadgeTone> = { high: "success", medium: "warning", low: "danger" };

const SUMMARY: Record<ReliabilityLevel, string> = {
  high: "I dati sono completi e aggiornati: la previsione è affidabile.",
  medium: "Alcuni dati mancano o sono vecchi: prendi la previsione con cautela.",
  low: "Mancano molti dati: la previsione può sbagliare di parecchio.",
};

export interface ReliabilityCardProps {
  reliability: Pick<Reliability, "score" | "level" | "accounts" | "suggestions">;
  /** Suggestions shown; the rest are summarised by a link to the projection page. Omit to show all. */
  maxSuggestions?: number;
  /** Lists each account's level (projection page). */
  showAccounts?: boolean;
}

/** How much to trust the projection, and the actions that would raise it. */
export function ReliabilityCard({ reliability, maxSuggestions = Infinity, showAccounts = false }: ReliabilityCardProps) {
  const { score, level, accounts, suggestions } = reliability;
  const shown = suggestions.slice(0, maxSuggestions);
  const more = suggestions.length - shown.length;
  return (
    <Card
      title="Affidabilità della proiezione"
      subtitle={SUMMARY[level]}
      action={
        <Badge tone={TONE[level]} icon={<ShieldCheck aria-hidden="true" />}>
          {LEVEL_LABEL[level]} · {score}/100
        </Badge>
      }
    >
      <div className="flex flex-col gap-4">
        {showAccounts && accounts.length > 1 && (
          <ul className="flex flex-wrap gap-2" aria-label="Affidabilità per conto">
            {accounts.map((a) => (
              <li key={a.accountId}>
                <Badge size="sm" tone={TONE[a.level]}>
                  {a.name}: {LEVEL_LABEL[a.level]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {shown.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border" aria-label="Come migliorarla">
            {shown.map((s) => (
              <li key={`${s.kind}-${s.accountId}`}>
                <Link href={s.href} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-brand-ink">
                  <span>{s.message}</span>
                  <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Nessuna azione da fare.</p>
        )}
        {more > 0 && (
          <Link href="/proiezioni" className="text-sm font-semibold text-brand-ink">
            {more === 1 ? "Vedi l'altro suggerimento" : `Vedi gli altri ${more} suggerimenti`}
          </Link>
        )}
      </div>
    </Card>
  );
}
