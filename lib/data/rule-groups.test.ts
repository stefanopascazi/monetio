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

  it("merges hidden accounts of the same owner into one group", () => {
    const hidden = [
      { ...r("h1", "Quota fissa Asha", "due", "Conto privato di Asha → Cointestato"), sourceName: "Conto privato di Asha" },
      { ...r("h2", "Babysitter metà", "estimate", "Conto privato di Asha → Cointestato"), sourceName: "Conto privato di Asha" },
    ];
    const groups = groupRules(hidden, accounts);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ accountId: "hidden:Conto privato di Asha", accountName: "Conto privato di Asha" });
    expect([groups[0].effective.length, groups[0].estimates.length]).toEqual([1, 1]);
  });

  it("filters by description, account or category ignoring case and accents", () => {
    expect(groupRules(rules, accounts, "LUCE").flatMap((g) => g.effective.map((x) => x.description))).toEqual(["Bolletta luce"]);
    expect(groupRules(rules, accounts, "mutuo")[0].effective.map((x) => x.description)).toEqual(["Rata mutuo"]);
    expect(groupRules([r("joint", "Caffè", "auto")], accounts, "caffe")).toHaveLength(1);
    expect(groupRules(rules, accounts, "zzz")).toEqual([]);
  });
});
