import { describe, expect, it } from "vitest";
import type { DraftStatus } from "./classify";
import { confirmedLinks, detectTransfers, draftIdentifiers, identifyAccounts, parseLinks, type TransferCandidate } from "./transfers";

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
    expect([...confirmedLinks(links, drafts, statuses)]).toEqual([[2, { accountId: "cherry", categoryId: "giro", existingId: ID }]]);
  });

  it("never keeps a link of the wrong shape for its status", () => {
    const ACC = "22222222-2222-4222-8222-222222222222";
    const statuses: DraftStatus[] = [{ kind: "transferNew", account: { id: ACC, name: "Cherry" }, via: "iban" }, { kind: "transfer", match: cand(ID, "2026-11-05", -1) }];
    const drafts = [{ line: 2 }, { line: 3 }];
    expect([...confirmedLinks([{ line: 2, accountId: ACC }, { line: 3, accountId: ACC }], drafts, statuses)]).toEqual([[2, { accountId: ACC, categoryId: null, existingId: null }]]);
    expect([...confirmedLinks([{ line: 2, transactionId: ID }], drafts, statuses)]).toEqual([]);
  });
});

const ACC_CHERRY = "cherry";
const IBAN_CHERRY = "IT60X0542811101000000123456";
const IBAN_OWN = "DE89370400440532013000";
const names = new Map([["cherry", "Cherry"], ["rev", "Revolut"]]);

describe("identifyAccounts", () => {
  const matches = [
    { accountId: ACC_CHERRY, iban: IBAN_CHERRY, card: null },
    { accountId: "rev", iban: IBAN_OWN, card: null },
    { accountId: ACC_CHERRY, iban: null, card: "1234" },
    { accountId: "a", iban: null, card: "9999" },
    { accountId: "b", iban: null, card: "9999" },
  ];

  it("finds the account by IBAN first, then by unambiguous card digits, ignoring the own account", () => {
    const drafts = [
      { description: `Bonifico Coor.Benef.: ${IBAN_CHERRY.replace(/(.{4})/g, "$1 ")} Banca` },
      { description: "Ricarica di *1234" },
      { description: `SDD debitore ${IBAN_OWN}` },
      { description: "Ricarica di *9999" },
      { description: "Bar" },
    ];
    expect(identifyAccounts(drafts, "rev", matches, names)).toEqual([
      { id: ACC_CHERRY, name: "Cherry", via: "iban" },
      { id: ACC_CHERRY, name: "Cherry", via: "card" },
      null,
      null,
      null,
    ]);
  });

  it("collects the identifiers to look up", () => {
    expect(draftIdentifiers([{ description: `x ${IBAN_CHERRY} *1234` }, { description: `${IBAN_CHERRY} *5678` }])).toEqual({ ibans: [IBAN_CHERRY], cards: ["1234", "5678"] });
  });
});

describe("detectTransfers with identified accounts", () => {
  const cherry = { id: ACC_CHERRY, name: "Cherry", via: "iban" as const };

  it("pairs with a movement on the named account, before amount-only matching", () => {
    const drafts = [{ bookedOn: "2026-11-05", amountCents: 80000 }];
    const other = cand("other", "2026-11-05", -80000, "fineco");
    const onCherry = cand("onCherry", "2026-11-03", -80000, ACC_CHERRY);
    expect(detectTransfers(drafts, [NEW], [other, onCherry], [cherry])).toEqual([{ kind: "transfer", match: onCherry, via: "iban" }]);
  });

  it("asks to create the other side when the named account has no matching movement", () => {
    const drafts = [
      { bookedOn: "2026-11-05", amountCents: 80000 },
      { bookedOn: "2026-11-05", amountCents: 80000 },
    ];
    const res = detectTransfers(drafts, [NEW, NEW], [cand("other", "2026-11-05", -80000, "fineco")], [cherry, null]);
    expect(res[0]).toEqual({ kind: "transferNew", account: { id: ACC_CHERRY, name: "Cherry" }, via: "iban" });
    expect(res[1]).toMatchObject({ kind: "transfer", match: { id: "other" } });
  });

  it("leaves duplicates alone even when the account is named", () => {
    expect(detectTransfers([{ bookedOn: "2026-11-05", amountCents: 1 }], [{ kind: "duplicate" }], [], [cherry])).toEqual([{ kind: "duplicate" }]);
  });

  it("accepts account links in parseLinks", () => {
    expect(parseLinks([{ line: 1, accountId: ID }])).toEqual([{ line: 1, accountId: ID }]);
    expect(parseLinks([{ line: 1, accountId: ID, transactionId: ID }])).toBeNull();
  });
});
