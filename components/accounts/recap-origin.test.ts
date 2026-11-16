import { describe, expect, it } from "vitest";
import { contribution, rule } from "@/lib/domain/fixtures";
import { originHref, originTag, originText, recapRules } from "./recap-origin";

const rules = recapRules(
  [
    rule({ id: "due", amountCents: -100, description: "Luce", schedule: "due", dayOfMonth: 15, startDate: "2026-01-15" }),
    rule({ id: "auto", amountCents: -100, description: "Mutuo", schedule: "auto", dayOfMonth: 1, startDate: "2026-01-01" }),
    rule({ id: "est", amountCents: -100, description: "Spesa", schedule: "estimate", dayOfMonth: 1, startDate: "2026-01-01" }),
  ],
  [contribution({ id: "q", description: "Quota casa", dayOfMonth: 5, startDate: "2026-01-05" })],
);
const at = { date: "2026-11-20" };

describe("recap-origin", () => {
  it("collects rules and contributions with their recurrence", () => {
    expect(rules.due).toMatchObject({ type: "rule", schedule: "due", recurrence: "Ogni mese il giorno 15" });
    expect(rules.q).toMatchObject({ type: "contribution", schedule: null, kind: "transfer", recurrence: "Ogni mese il giorno 5" });
  });

  it("links to the source in its Scadenze tab", () => {
    expect(originHref(rules.due)).toBe("/scadenze?sezione=ricorrenze&apri=due");
    expect(originHref(rules.q)).toBe("/scadenze?sezione=quote&apri=q");
  });

  it("tags rule rows by how they get booked", () => {
    expect(originTag({ source: "rule" }, rules.due)?.label).toBe("scadenza");
    expect(originTag({ source: "rule" }, rules.auto)?.label).toBe("automatico");
    expect(originTag({ source: "estimate" }, rules.est)).toBeNull();
    expect(originTag({ source: "rule" })).toBeNull();
  });

  it("explains each origin and how it will be booked", () => {
    expect(originText({ ...at, source: "rule", ref: "r:due|2026-11" }, rules.due)).toContain("Non si registra da sola");
    expect(originText({ ...at, source: "rule", ref: "r:auto|2026-11" }, rules.auto)).toContain("Si registra da sola il");
    expect(originText({ ...at, source: "rule" }, rules.due)).toContain("Spese della ricorrenza «Luce»");
    expect(originText({ ...at, source: "estimate", ref: "r:est|2026-11" }, rules.est)).toContain("Stima «Spesa»");
    expect(originText({ ...at, source: "contribution", ref: "c:q|2026-11" }, rules.q)).toContain("Quota «Quota casa» · Ogni mese il giorno 5");
    expect(originText({ ...at, source: "planned" }, undefined, "Anna")).toContain("pianificato inserito da Anna: si registra da solo il");
    expect(originText({ ...at, source: "rule", ref: "r:x|2026-11" })).toContain("non più visibile");
  });
});
