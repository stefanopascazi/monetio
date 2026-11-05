import { describe, expect, it } from "vitest";
import type { DueEntry } from "../domain/schedule";
import { pendingTransfersByAccount } from "./pending-transfers";

const entry = (p: Partial<DueEntry>): DueEntry => ({
  key: Math.random().toString(),
  source: "rule",
  ruleId: "r",
  date: "2026-11-10",
  occurrenceDate: "2026-11-10",
  accountId: "ste",
  counterpartAccountId: "joint",
  categoryId: null,
  kind: "transfer",
  description: "x",
  amountCents: -80000,
  overdue: false,
  estimated: false,
  confirmed: false,
  ...p,
});

describe("pendingTransfersByAccount", () => {
  it("sums outgoing and incoming transfers up to a date", () => {
    const res = pendingTransfersByAccount(
      [
        entry({}),
        entry({ amountCents: -17100, source: "contribution" }),
        entry({ accountId: "joint", counterpartAccountId: "card", amountCents: -34200 }),
        entry({ date: "2026-12-03" }),
        entry({ kind: "expense", counterpartAccountId: null }),
      ],
      "2026-11-30",
    );
    expect(res).toEqual({
      ste: { outCents: 97100, inCents: 0, count: 2 },
      joint: { outCents: 34200, inCents: 97100, count: 3 },
      card: { outCents: 0, inCents: 34200, count: 1 },
    });
  });
});
