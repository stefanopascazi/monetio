import { Sparkles } from "lucide-react";
import { Alert, Badge, type BadgeTone } from "@monetio/ui";
import { ADVISOR_AI_LABEL, ADVISOR_DISCLAIMER, ADVISOR_PLAN_DISCLAIMER } from "@/lib/advisor/perimeter";
import type { AdvisorTurnView } from "@/lib/advisor/turns";
import type { VerdictTone } from "@/lib/advisor/view";
import { RatingButtons } from "./RatingButtons";

const TONE: Record<VerdictTone, BadgeTone> = { positive: "success", warning: "warning", negative: "danger" };

/** The assistant's side of one exchange: engine verdict (numbers), explanation, disclaimers, feedback. */
export function AdvisorAnswer({ turn }: { turn: AdvisorTurnView }) {
  const { verdict } = turn;
  return (
    <div className="flex flex-col gap-3 rounded-2xl rounded-tl-sm bg-surface-raised p-4">
      <Badge tone="forecast" size="sm" icon={<Sparkles aria-hidden="true" className="size-3" />} className="self-start">
        {ADVISOR_AI_LABEL}
      </Badge>
      {turn.paymentPlan && (
        <Alert tone="warning" title="Solo una stima, non una valutazione del finanziamento">
          {ADVISOR_PLAN_DISCLAIMER}
        </Alert>
      )}
      {verdict && (
        <section aria-label="Verdetto calcolato" className="flex flex-col gap-2 rounded-xl bg-surface-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[verdict.tone]}>{verdict.title}</Badge>
            <span className="text-xs text-ink-muted">{verdict.goal}</span>
          </div>
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {verdict.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
      <p className="whitespace-pre-line text-sm text-ink">{turn.text}</p>
      <p className="text-xs text-ink-muted">{ADVISOR_DISCLAIMER}</p>
      {turn.requestId && !turn.refused && <RatingButtons key={turn.requestId} requestId={turn.requestId} initial={turn.rating} />}
    </div>
  );
}
