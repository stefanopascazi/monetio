import { describe, expect, it } from "vitest";
import { contribution, rule } from "../domain/fixtures";
import type { DueEntry } from "../domain/schedule";
import { contributionViews, dueViews, ruleViews } from "./page-views";

const accounts = [
  { id: "joint", name: "Cointestato" },
  { id: "a1", name: "Conto Ste" },
];

describe("page views", () => {
  it("builds due views with payable flag and transfer names", () => {
    const e: DueEntry = {
      key: "c:c1|2026-11-28",
      source: "contribution",
      ruleId: "c1",
      date: "2026-11-28",
      occurrenceDate: "2026-11-28",
      accountId: "asha",
      counterpartAccountId: "joint",
      categoryId: null,
      kind: "transfer",
      description: "Quota Asha",
      amountCents: -95000,
      overdue: false,
      estimated: true,
      confirmed: false,
    };
    expect(dueViews([e], [], accounts)[0]).toMatchObject({ accountName: "Conto privato → Cointestato", payable: false, frequency: "monthly", amountCents: 95000 });
    const named = dueViews([e], [], accounts, [{ id: "asha", name: "Conto privato di Asha" }])[0];
    expect(named.accountName).toBe("Conto privato di Asha → Cointestato");
  });

  it("adds next occurrence to rules", () => {
    const [v] = ruleViews([rule({ amountCents: -100, dayOfMonth: 10 })], accounts, "2026-11-05");
    expect(v).toMatchObject({ accountName: "Conto Ste", nextDate: "2026-11-10", editable: true });
  });

  it("marks transfers from hidden accounts as read-only", () => {
    const [v] = ruleViews([rule({ kind: "transfer", accountId: "asha", counterpartAccountId: "joint", amountCents: -80000 })], accounts, "2026-11-05");
    expect(v).toMatchObject({ accountName: "Conto privato → Cointestato", sourceName: "Conto privato", editable: false, viewCents: 80000 });
  });

  it("computes the current contribution", () => {
    const [v] = contributionViews([contribution({ fromAccountId: "a1", toAccountId: "joint" })], accounts, "2026-11-05", () => 28057);
    // Open month: max(actual 280.57, estimate 450) / 2 = 225 -> 230 (rounded up to 10), + 800.
    expect(v).toMatchObject({ fromName: "Conto Ste", toName: "Cointestato", currentCents: 103000, editable: true });
  });
});
