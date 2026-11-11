import { describe, expect, it } from "vitest";
import { dedupKey, normalizeDescription, splitDuplicates, withImportRefs } from "./dedup";

const d = (bookedOn: string, amountCents: number, description: string) => ({ line: 1, bookedOn, amountCents, description, category: null });

describe("normalizeDescription", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalizeDescription("  Pagamento  POS - Caffè, Bar!  ")).toBe("pagamento pos caffe bar");
  });
});

describe("dedupKey", () => {
  it("matches the same movement written differently", () => {
    expect(dedupKey(d("2025-01-01", -120, "CAFFÈ bar"))).toBe(dedupKey(d("2025-01-01", -120, "caffe  BAR.")));
    expect(dedupKey(d("2025-01-01", -120, "Bar"))).not.toBe(dedupKey(d("2025-01-02", -120, "Bar")));
  });
});

describe("withImportRefs", () => {
  it("gives identical rows distinct, stable refs", () => {
    const rows = [d("2025-01-01", -120, "Bar"), d("2025-01-01", -120, "bar"), d("2025-01-02", -500, "Spesa")];
    const refs = withImportRefs("acc", rows).map((r) => r.importRef);
    expect(new Set(refs).size).toBe(3);
    expect(refs[0]).toMatch(/^imp:acc:2025-01-01:-120:[0-9a-f]{8}:0$/);
    expect(refs[1]).toBe(refs[0].replace(/:0$/, ":1"));
    expect(withImportRefs("acc", rows).map((r) => r.importRef)).toEqual(refs);
    expect(withImportRefs("other", rows)[0].importRef).not.toBe(refs[0]);
  });
});

describe("splitDuplicates", () => {
  it("drops everything when the same file is imported again", () => {
    const rows = [d("2025-01-01", -120, "Bar"), d("2025-01-01", -120, "Bar")];
    expect(splitDuplicates(rows, rows)).toEqual({ fresh: [], duplicates: rows });
  });

  it("counts repeated movements as a multiset", () => {
    const rows = [d("2025-01-01", -120, "Bar"), d("2025-01-01", -120, "Bar"), d("2025-01-01", -120, "Bar")];
    const { fresh, duplicates } = splitDuplicates(rows, [d("2025-01-01", -120, "bar")]);
    expect(duplicates).toHaveLength(1);
    expect(fresh).toHaveLength(2);
  });

  it("keeps movements that differ in date, amount or description", () => {
    const existing = [d("2025-01-01", -120, "Bar")];
    const rows = [d("2025-01-02", -120, "Bar"), d("2025-01-01", -121, "Bar"), d("2025-01-01", -120, "Pizzeria")];
    expect(splitDuplicates(rows, existing).fresh).toEqual(rows);
  });
});
