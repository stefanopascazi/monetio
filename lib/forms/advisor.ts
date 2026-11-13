import { Checker, type ParseResult } from "./parse";

export const QUESTION_MAX = 500;

/** Advisor question: a short sentence, not a document. */
export function parseAdvisorQuestion(raw: unknown): ParseResult<string> {
  const question = (typeof raw === "string" ? raw : "").replace(/\s+/g, " ").trim();
  const c = new Checker();
  c.check(question.length >= 5, "question", "Scrivi una domanda.");
  c.check(question.length <= QUESTION_MAX, "question", `Massimo ${QUESTION_MAX} caratteri.`);
  return c.result(question);
}
