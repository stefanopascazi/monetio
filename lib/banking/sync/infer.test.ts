import { describe, expect, it } from "vitest";
import type { Category } from "../../domain/types";
import { GENERIC_BANK_DESCRIPTION } from "../../import/matches";
import { genericAmounts, type HistoryMovement, inferFromHistory, withInferredDetails } from "./infer";
import type { Decision } from "./match";

const cat = (id: string, kind: Category["kind"], archived = false): Category => ({ id, name: id, kind, icon: null, colorIndex: 1, archived });
const categories = [cat("auto", "expense"), cat("extra", "expense"), cat("old", "expense", true), cat("salary", "income")];
const h = (amountCents: number, description: string, categoryId: string, bookedOn = "2026-11-01"): HistoryMovement => ({
  bookedOn: bookedOn as HistoryMovement["bookedOn"],
  amountCents,
  description,
  categoryId,
});
const generic = { amountCents: -160, description: GENERIC_BANK_DESCRIPTION };
const tolls = [h(-160, "Autostrada", "auto", "2026-10-01"), h(-160, "autostrada", "auto", "2026-11-20")];

describe("inferFromHistory", () => {
  it("takes the dominant description and category of the same exact amount, latest wording", () => {
    expect(inferFromHistory(generic, [...tolls, h(-220, "Autostrada", "auto")], categories)).toEqual({ description: "autostrada", categoryId: "auto", count: 2 });
  });

  it("needs at least two earlier movements", () => {
    expect(inferFromHistory(generic, [tolls[0]], categories)).toBeNull();
  });

  it("leaves ambiguous amounts alone (winner under 80%)", () => {
    const fifty = [h(-5000, "Gasolio", "auto"), h(-5000, "Gasolio", "auto"), h(-5000, "Spesa", "extra")];
    expect(inferFromHistory({ ...generic, amountCents: -5000 }, fifty, categories)).toBeNull();
    const more = [...fifty, h(-5000, "Gasolio", "auto"), h(-5000, "Gasolio", "auto")];
    expect(inferFromHistory({ ...generic, amountCents: -5000 }, more, categories)).toMatchObject({ description: "Gasolio", count: 4 });
  });

  it("ignores other amounts, other directions and descriptions with nothing to match on", () => {
    const noise = [h(-161, "Autostrada", "auto"), h(160, "Rimborso", "salary"), h(-160, "123", "auto"), tolls[0]];
    expect(inferFromHistory(generic, noise, categories)).toBeNull();
  });

  it("only infers movements with the generic description", () => {
    expect(inferFromHistory({ amountCents: -160, description: "Steam" }, tolls, categories)).toBeNull();
  });

  it("drops a category no longer usable", () => {
    expect(inferFromHistory(generic, [h(-160, "Pedaggio", "old"), h(-160, "Pedaggio", "old")], categories)).toBeNull();
  });
});

const mov = (ref: string, amountCents: number, description = GENERIC_BANK_DESCRIPTION) => ({ ref, bookedOn: "2026-11-26" as const, amountCents, description, counterpartyIban: null });

describe("withInferredDetails", () => {
  it("fills inserted generic movements and keeps the others", () => {
    const decisions: Decision[] = [
      { type: "insert", movement: mov("a", -160) },
      { type: "insert", movement: mov("b", -1000) },
      { type: "insert", movement: mov("c", -160, "Steam") },
      { type: "skip", movement: mov("d", -160) },
    ];
    const out = withInferredDetails(decisions, tolls, categories);
    expect(out[0]).toEqual({ type: "insert", movement: mov("a", -160), categoryId: "auto", inferred: { description: "autostrada", count: 2 } });
    expect(out.slice(1)).toEqual(decisions.slice(1));
  });
});

describe("genericAmounts", () => {
  it("lists the distinct amounts of inserted generic movements", () => {
    const decisions: Decision[] = [
      { type: "insert", movement: mov("a", -160) },
      { type: "insert", movement: mov("b", -160) },
      { type: "insert", movement: mov("c", -1000, "Steam") },
      { type: "skip", movement: mov("d", -500) },
    ];
    expect(genericAmounts(decisions)).toEqual([-160]);
  });
});
