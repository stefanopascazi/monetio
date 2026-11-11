import { describe, expect, it } from "vitest";
import { batchStats, mapBatch, parseImportMeta } from "./batch";

describe("parseImportMeta", () => {
  it("trims and caps the file name and bank", () => {
    expect(parseImportMeta({ fileName: " revolut.csv ", bank: "Revolut" })).toEqual({ fileName: "revolut.csv", bank: "Revolut" });
    expect(parseImportMeta({ fileName: "x".repeat(300), bank: " " })).toEqual({ fileName: "x".repeat(200), bank: null });
    expect(parseImportMeta({ fileName: "a.csv" })).toEqual({ fileName: "a.csv", bank: null });
  });

  it.each([null, "x", {}, { fileName: "  " }, { fileName: "a.csv", bank: 3 }])("rejects %j", (input) => {
    expect(parseImportMeta(input)).toBeNull();
  });
});

describe("batchStats", () => {
  it("counts, sums and spans the inserted rows", () => {
    expect(
      batchStats([
        { amountCents: -100, bookedOn: "2025-02-03" },
        { amountCents: 500, bookedOn: "2025-01-01" },
      ]),
    ).toEqual({ rowCount: 2, totalCents: 400, firstDate: "2025-01-01", lastDate: "2025-02-03" });
    expect(batchStats([])).toEqual({ rowCount: 0, totalCents: 0, firstDate: null, lastDate: null });
  });
});

describe("mapBatch", () => {
  it("maps a database row", () => {
    expect(
      mapBatch({
        id: "b",
        account_id: "a",
        file_name: "f.csv",
        bank: null,
        row_count: 3,
        total_cents: "-1200",
        first_date: "2025-01-01",
        last_date: "2025-01-31",
        created_at: "2025-02-01T10:00:00Z",
        undone_at: null,
      }),
    ).toEqual({ id: "b", accountId: "a", fileName: "f.csv", bank: null, rowCount: 3, totalCents: -1200, firstDate: "2025-01-01", lastDate: "2025-01-31", createdAt: "2025-02-01T10:00:00Z", undoneAt: null });
  });
});
