import { describe, expect, it } from "vitest";
import type { DraftStatus } from "./classify";
import { confirmedLinks, detectTransfers, parseLinks, type TransferCandidate } from "./transfers";

const cand = (id: string, bookedOn: string, amountCents: number, accountId = "cherry"): TransferCandidate => ({
  id,
  accountId,
  accountName: "Cherry",
  bookedOn,
  amountCents,
  description: "Ricarica conto personale",
  categoryId: "giro",
});
const NEW: DraftStatus = { kind: "new" };
const ID = "11111111-1111-4111-8111-111111111111";

describe("detectTransfers", () => {
  it("pairs a new draft with the opposite amount on another account, nearest date first", () => {
    const drafts = [{ bookedOn: "2026-11-05", amountCents: 80000 }];
    const far = cand("far", "2026-11-02", -80000);
    const near = cand("near", "2026-11-04", -80000);
    expect(detectTransfers(drafts, [NEW], [far, near])).toEqual([{ kind: "transfer", match: near }]);
  });

  it("ignores same-sign amounts, dates outside the window and non-new statuses", () => {
    const drafts = [
      { bookedOn: "2026-11-05", amountCents: 80000 },
      { bookedOn: "2026-11-05", amountCents: 80000 },
      { bookedOn: "2026-11-05", amountCents: -5000 },
    ];
    const statuses: DraftStatus[] = [NEW, { kind: "duplicate" }, NEW];
    const res = detectTransfers(drafts, statuses, [cand("same", "2026-11-05", 80000), cand("old", "2026-10-30", -80000), cand("dup", "2026-11-05", 5000)]);
    expect(res[0]).toEqual(NEW);
    expect(res[1]).toEqual({ kind: "duplicate" });
    expect(res[2]).toEqual({ kind: "transfer", match: cand("dup", "2026-11-05", 5000) });
  });

  it("uses each candidate once", () => {
    const drafts = [
      { bookedOn: "2026-11-05", amountCents: 1000 },
      { bookedOn: "2026-11-05", amountCents: 1000 },
    ];
    const res = detectTransfers(drafts, [NEW, NEW], [cand("only", "2026-11-05", -1000)]);
    expect(res.map((s) => s.kind)).toEqual(["transfer", "new"]);
  });
});

describe("parseLinks", () => {
  it("accepts a missing or valid list", () => {
    expect(parseLinks(undefined)).toEqual([]);
    expect(parseLinks([{ line: 2, transactionId: ID }])).toEqual([{ line: 2, transactionId: ID }]);
  });

  it.each(["x", [{ line: "2", transactionId: ID }], [{ line: 2, transactionId: "nope" }], [null]])("rejects %j", (input) => {
    expect(parseLinks(input)).toBeNull();
  });
});

describe("confirmedLinks", () => {
  it("keeps only links matching the server's own detection", () => {
    const match = cand(ID, "2026-11-05", -1000);
    const drafts = [{ line: 2 }, { line: 3 }, { line: 4 }];
    const statuses: DraftStatus[] = [{ kind: "transfer", match }, { kind: "transfer", match: cand("other", "2026-11-05", -5) }, NEW];
    const links = [
      { line: 2, transactionId: ID },
      { line: 3, transactionId: ID },
      { line: 4, transactionId: ID },
    ];
    expect([...confirmedLinks(links, drafts, statuses)]).toEqual([[2, match]]);
  });
});
