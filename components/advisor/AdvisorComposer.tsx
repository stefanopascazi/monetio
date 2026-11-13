"use client";

import { SendHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, Chip, TextField } from "@monetio/ui";
import { canContinue, MAX_TURNS, pageContext } from "@/lib/advisor/conversation";
import { QUESTION_MAX } from "@/lib/forms/advisor";

interface Props {
  turns: number;
  busy: boolean;
  onAsk: (question: string, page: string | null) => void;
  onNew: () => void;
}

/** Question box; suggestions from the current page while the conversation is empty. */
export function AdvisorComposer({ turns, busy, onAsk, onNew }: Props) {
  const pathname = usePathname();
  const [question, setQuestion] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 5 || busy) return;
    onAsk(q, pathname);
    setQuestion("");
  };

  if (!canContinue(turns)) {
    return (
      <div className="flex flex-col gap-2 text-sm text-ink-muted">
        <p>Questa conversazione ha raggiunto {MAX_TURNS} domande.</p>
        <Button type="button" onClick={onNew} className="self-start">
          Nuova conversazione
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {turns === 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Domande suggerite">
          {pageContext(pathname).suggestions.map((s) => (
            // A suggestion is a ready question: one tap sends it.
            <Chip key={s} type="button" disabled={busy} onClick={() => onAsk(s, pathname)}>
              {s}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <TextField
          name="question"
          label={turns === 0 ? "Cosa vuoi sapere?" : "Continua la conversazione"}
          placeholder={turns === 0 ? "Possiamo permetterci…" : "E se…"}
          maxLength={QUESTION_MAX}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoComplete="off"
          className="flex-1"
        />
        <Button type="submit" iconOnly aria-label="Invia" loading={busy} iconStart={<SendHorizontal aria-hidden="true" className="size-4" />} />
      </div>
    </form>
  );
}
