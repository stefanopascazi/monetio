import { describe, expect, it } from "vitest";
import { groupRules } from "./rule-groups";

const r = (accountId: string, description: string, schedule: "auto" | "due" | "estimate", accountName = accountId, categoryName: string | null = null) => ({
  accountId,
  description,
  schedule,
  accountName,
  categoryName,
});

const accounts = [
  { id: "joint", name: "Cointestato" },
  { id: "ste", name: "Conto Ste" },
];

describe("groupRules", () => {
  const rules = [
    r("ste", "Quota fissa Ste", "due", "Conto Ste → Cointestato"),
    r("joint", "Rata mutuo", "auto", "Cointestato", "Mutuo"),
    r("joint", "Bolletta luce", "due", "Cointestato", "Luce"),
    r("joint", "Spesa (stima)", "estimate", "Cointestato", "Spesa"),
    r("secret", "Altro", "auto", "Conto privato"),
  ];

  it("groups by account in order and splits estimates", () => {
    const groups = groupRules(rules, accounts);
    expect(groups.map((g) => [g.accountName, g.effective.map((x) => x.description), g.estimates.map((x) => x.description)])).toEqual([
      ["Cointestato", ["Bolletta luce", "Rata mutuo"], ["Spesa (stima)"]],
      ["Conto Ste", ["Quota fissa Ste"], []],
      ["Conto privato", ["Altro"], []],
    ]);
  });

  it("filters by description, account or category ignoring case and accents", () => {
    expect(groupRules(rules, accounts, "LUCE").flatMap((g) => g.effective.map((x) => x.description))).toEqual(["Bolletta luce"]);
    expect(groupRules(rules, accounts, "mutuo")[0].effective.map((x) => x.description)).toEqual(["Rata mutuo"]);
    expect(groupRules([r("joint", "Caffè", "auto")], accounts, "caffe")).toHaveLength(1);
    expect(groupRules(rules, accounts, "zzz")).toEqual([]);
  });
});
