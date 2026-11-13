"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@monetio/ui";
import { rateAdvisorAnswer } from "@/app/actions/advisor";

/** Thumbs up/down on an answer: the feedback that tells whether the experiment works. */
export function RatingButtons({ requestId }: { requestId: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const rate = (value: 1 | -1) =>
    start(async () => {
      const { ok } = await rateAdvisorAnswer(requestId, value);
      setFailed(!ok);
      if (ok) setRating(value);
    });

  if (rating) return <p className="text-xs text-ink-muted">Grazie, risposta segnata come {rating === 1 ? "utile" : "da migliorare"}.</p>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-muted">{failed ? "Non salvato, riprova." : "Ti è stata utile?"}</span>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => rate(1)} aria-label="Utile" iconOnly iconStart={<ThumbsUp aria-hidden="true" className="size-4" />} />
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => rate(-1)} aria-label="Da migliorare" iconOnly iconStart={<ThumbsDown aria-hidden="true" className="size-4" />} />
    </div>
  );
}
