import { describe, expect, it } from "vitest";
import { periodLabel, toBatchView } from "./history-view";

const batch = {
  id: "b",
  accountId: "a",
  fileName: "revolut.csv",
  bank: "Revolut",
  rowCount: 117,
  totalCents: 12775,
  firstDate: "2019-11-29",
  lastDate: "2026-11-08",
  // 23:30 UTC is already the next day in Rome.
  createdAt: "2026-11-10T23:30:00Z",
  undoneAt: null,
};

describe("periodLabel", () => {
  it("formats single days, ranges and missing dates", () => {
    expect(periodLabel("2025-01-02", "2025-01-02")).toBe("2 gen 2025");
    expect(periodLabel("2025-01-02", "2025-02-03")).toBe("dal 2 gen 2025 al 3 feb 2025");
    expect(periodLabel(null, null)).toBeNull();
  });
});

describe("toBatchView", () => {
  it("labels the account and dates in Rome time", () => {
    expect(toBatchView(batch, new Map([["a", "Revolut"]]))).toEqual({
      id: "b",
      fileName: "revolut.csv",
      bank: "Revolut",
      accountName: "Revolut",
      importedOn: "11 nov 2026",
      period: "dal 29 nov 2019 al 8 nov 2026",
      rowCount: 117,
      totalCents: 12775,
      undone: false,
      undoneOn: null,
    });
  });

  it("marks undone imports and unknown accounts", () => {
    const v = toBatchView({ ...batch, undoneAt: "2026-11-12T08:00:00Z" }, new Map());
    expect(v).toMatchObject({ accountName: "Conto non disponibile", undone: true, undoneOn: "12 nov 2026" });
  });
});
