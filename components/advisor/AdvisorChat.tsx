"use client";

import { useActionState, useState } from "react";
import { Alert, Button, Chip, TextField } from "@monetio/ui";
import { askAdvisor, type AdvisorState } from "@/app/actions/advisor";
import { QUESTION_MAX } from "@/lib/forms/advisor";
import { AdvisorAnswerCard } from "./AdvisorAnswerCard";

const EXAMPLES = [
  "Possiamo permetterci una vacanza di 3.000 € ad agosto?",
  "Se tagliamo i ristoranti del 30%, quanto ci resta a fine anno?",
  "Riusciamo ad accantonare 200 € al mese da gennaio?",
];

/** Question box with examples; the latest answer appears below. */
export function AdvisorChat() {
  const [state, action, pending] = useActionState<AdvisorState, FormData>(askAdvisor, {});
  const [question, setQuestion] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-3">
        <TextField
          name="question"
          label="Cosa vuoi sapere?"
          placeholder="Possiamo permetterci…"
          hint="Solo pianificazione del bilancio di famiglia: niente investimenti, prestiti, assicurazioni o fisco."
          maxLength={QUESTION_MAX}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          error={state.errors?.question}
          required
        />
        <div className="flex flex-wrap gap-2" aria-label="Esempi di domande">
          {EXAMPLES.map((q) => (
            <Chip key={q} type="button" onClick={() => setQuestion(q)}>
              {q}
            </Chip>
          ))}
        </div>
        <Button type="submit" loading={pending} className="self-start">
          {pending ? "Sto facendo i conti…" : "Chiedi"}
        </Button>
      </form>
      {state.ok === false && state.message && <Alert tone="danger">{state.message}</Alert>}
      {state.answer && !pending && <AdvisorAnswerCard answer={state.answer} />}
    </div>
  );
}
