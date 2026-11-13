import { describe, expect, it } from "vitest";
import { parseAdvisorQuestion, QUESTION_MAX } from "./advisor";

describe("parseAdvisorQuestion", () => {
  it("trims and collapses whitespace", () => {
    expect(parseAdvisorQuestion("  Possiamo   permetterci\n una vacanza?  ")).toEqual({ ok: true, value: "Possiamo permetterci una vacanza?" });
  });

  it("rejects an empty, non-text or too long question", () => {
    expect(parseAdvisorQuestion("  ")).toEqual({ ok: false, errors: { question: "Scrivi una domanda." } });
    expect(parseAdvisorQuestion(42)).toEqual({ ok: false, errors: { question: "Scrivi una domanda." } });
    expect(parseAdvisorQuestion("a".repeat(QUESTION_MAX + 1))).toEqual({ ok: false, errors: { question: `Massimo ${QUESTION_MAX} caratteri.` } });
  });
});
