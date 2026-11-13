import { Sparkles } from "lucide-react";
import { Badge, type BadgeTone, Card } from "@monetio/ui";
import type { AdvisorAnswer } from "@/app/actions/advisor";
import { ADVISOR_AI_LABEL, ADVISOR_DISCLAIMER } from "@/lib/advisor/perimeter";
import type { VerdictTone } from "@/lib/advisor/view";
import { RatingButtons } from "./RatingButtons";

const TONE: Record<VerdictTone, BadgeTone> = { positive: "success", warning: "warning", negative: "danger" };

/** One answer: engine verdict (numbers), the model's explanation, disclaimer and feedback. */
export function AdvisorAnswerCard({ answer }: { answer: AdvisorAnswer }) {
  const { verdict } = answer;
  return (
    <Card title={answer.question} action={<Badge tone="forecast" icon={<Sparkles aria-hidden="true" className="size-3" />}>{ADVISOR_AI_LABEL}</Badge>}>
      <div className="flex flex-col gap-4">
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
        <p className="whitespace-pre-line text-sm text-ink">{answer.text}</p>
        <p className="text-xs text-ink-muted">{ADVISOR_DISCLAIMER}</p>
        {answer.requestId && !answer.refused && <RatingButtons key={answer.requestId} requestId={answer.requestId} />}
      </div>
    </Card>
  );
}
