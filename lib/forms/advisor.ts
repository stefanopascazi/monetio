import { Checker, type ParseResult, text } from "./parse";

export const QUESTION_MAX = 500;

/** Advisor question: a short sentence, not a document. */
export function parseAdvisorQuestion(fd: FormData): ParseResult<string> {
  const question = text(fd, "question").replace(/\s+/g, " ");
  const c = new Checker();
  c.check(question.length >= 5, "question", "Scrivi una domanda.");
  c.check(question.length <= QUESTION_MAX, "question", `Massimo ${QUESTION_MAX} caratteri.`);
  return c.result(question);
}
