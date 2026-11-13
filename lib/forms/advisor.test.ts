import { describe, expect, it } from "vitest";
import { parseAdvisorQuestion, QUESTION_MAX } from "./advisor";

const fd = (question: string) => {
  const f = new FormData();
  f.set("question", question);
  return f;
};

describe("parseAdvisorQuestion", () => {
  it("trims and collapses whitespace", () => {
    expect(parseAdvisorQuestion(fd("  Possiamo   permetterci\n una vacanza?  "))).toEqual({ ok: true, value: "Possiamo permetterci una vacanza?" });
  });

  it("rejects an empty or too long question", () => {
    expect(parseAdvisorQuestion(fd("  "))).toEqual({ ok: false, errors: { question: "Scrivi una domanda." } });
    expect(parseAdvisorQuestion(fd("a".repeat(QUESTION_MAX + 1)))).toEqual({ ok: false, errors: { question: `Massimo ${QUESTION_MAX} caratteri.` } });
  });
});
