"use client";

import { Amount, Badge, Button, Card } from "@monetio/ui";
import { resolveBankReview } from "@/app/actions/bank-reviews";
import { useToastAction } from "@/hooks/useToastAction";
import { type BankReview, type BankReviewAction, REVIEW_REASON_LABEL, reviewActions } from "@/lib/banking/reviews";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });
const day = (iso: string) => dateFormat.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

const ACTION_LABEL: Record<BankReviewAction, string> = { matched: "È lo stesso", added: "Aggiungi", ignored: "Ignora" };

/** Bank movements the sync left to a person: add, merge into the recorded one, or ignore. */
export function BankReviewList({ reviews }: { reviews: BankReview[] }) {
  const { pending, run } = useToastAction();
  if (!reviews.length) return null;
  return (
    <Card title="Da rivedere" subtitle="Movimenti della banca che non ho saputo abbinare da solo" action={<Badge tone="warning">{reviews.length}</Badge>}>
      <ul className="flex flex-col gap-2">
        {reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-[14px] bg-surface-raised p-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.description}</p>
                <p className="text-xs text-ink-muted">
                  {day(r.bookedOn)} · {r.accountName} · {REVIEW_REASON_LABEL[r.reason]}
                </p>
              </div>
              <Amount cents={r.amountCents} showSign />
            </div>
            {r.candidate && (
              <div className="flex items-center gap-3 text-xs text-ink-muted">
                <span className="min-w-0 flex-1 truncate">
                  Già registrato: {r.candidate.description} · {day(r.candidate.bookedOn)}
                </span>
                <Amount cents={r.candidate.amountCents} tone="neutral" size="sm" showSign />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {reviewActions(r).map((action, i) => (
                <Button
                  key={action}
                  size="sm"
                  variant={i === 0 ? "primary" : "ghost"}
                  disabled={pending}
                  onClick={() => run(() => resolveBankReview(r.id, action))}
                >
                  {ACTION_LABEL[action]}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
