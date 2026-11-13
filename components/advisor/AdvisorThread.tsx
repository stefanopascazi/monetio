"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PendingTurn } from "@/hooks/useAdvisorChat";
import type { AdvisorTurnView } from "@/lib/advisor/turns";
import { AdvisorAnswer } from "./AdvisorAnswer";

function Question({ text }: { text: string }) {
  return <p className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-tr-sm bg-brand px-4 py-2 text-sm text-on-brand">{text}</p>;
}

/** The exchanges of a conversation, newest at the bottom, with the progress of the running question. */
export function AdvisorThread({ turns, pending }: { turns: AdvisorTurnView[]; pending: PendingTurn | null }) {
  const end = useRef<HTMLDivElement>(null);
  // Keep the latest exchange (or the progress line) in view.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns.length, pending?.status]);

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {turns.map((t, i) => (
        <div key={t.requestId ?? i} className="flex flex-col gap-3">
          <Question text={t.question} />
          <AdvisorAnswer turn={t} />
        </div>
      ))}
      {pending && (
        <>
          <Question text={pending.question} />
          <p role="status" className="flex items-center gap-2 self-start rounded-2xl bg-surface-raised px-4 py-3 text-sm text-ink-muted">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            {pending.status}
          </p>
        </>
      )}
      <div ref={end} />
    </div>
  );
}
