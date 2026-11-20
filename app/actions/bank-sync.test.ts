import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionResource } from "@/lib/banking/enable-banking/types";

const previewContext = vi.fn();
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1", "user-agent": "UA" })),
}));
vi.mock("@/lib/data/context", () => ({ getContext: vi.fn(async () => ({ userId: "user-1", householdId: "h1" })) }));
const CAT = "99999999-8888-4777-8666-555555555555";
const OTHER = "99999999-8888-4777-8666-444444444444";
vi.mock("@/lib/data/queries", () => ({
  listCategories: vi.fn(async () => [
    { id: CAT, name: "Varie", kind: "expense", icon: null, colorIndex: 1, archived: false },
    { id: OTHER, name: "Stipendio", kind: "income", icon: null, colorIndex: 2, archived: false },
  ]),
}));
const applyCategoryChoice = vi.fn(async () => 0);
vi.mock("@/lib/data/category-matches", () => ({ applyCategoryChoice }));
vi.mock("@/lib/banking/server", () => ({ bankService: vi.fn(() => ({ previewContext })) }));
vi.mock("@/lib/domain/dates", async (orig) => ({ ...(await orig<object>()), todayISO: () => "2026-11-20" }));
const rpc = vi.fn();
const bankAccountRow = { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { account_id: "acc1" } }) }) }) };
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ rpc, from: () => bankAccountRow })) }));
const loadExisting = vi.fn(async () => ({
  candidates: [{ id: "t1", bookedOn: "2026-11-10", amountCents: -5000, description: "Mov a", fromRule: false, bankRef: null, counterpartId: null }],
  reviewRefs: [],
}));
vi.mock("@/lib/data/bank-sync-store", () => ({ createPreviewSyncStore: () => ({ loadExisting }) }));

const { confirmBankSync, previewBankSync } = await import("./bank-sync");

const ba = "11111111-2222-3333-4444-555555555555";
const txn = (ref: string, date: string, amount: string): TransactionResource => ({
  entry_reference: ref,
  booking_date: date,
  transaction_amount: { currency: "EUR", amount },
  credit_debit_indicator: "DBIT",
  status: "BOOK",
  remittance_information: [`Mov ${ref}`],
});
const client = {
  getBalances: vi.fn(async () => [{ balance_amount: { currency: "EUR", amount: "100.00" }, balance_type: "CLBD", reference_date: "2026-11-20" }]),
  getTransactions: vi.fn(async () => [txn("a", "2026-11-10", "50.00"), txn("b", "2026-11-12", "20.00"), txn("c", "2026-11-13", "8.00")]),
};
const target = {
  bankAccountId: ba,
  uid: "u1",
  userId: "user-1",
  householdId: "h1",
  accountId: "acc1",
  openingDate: "2024-01-01",
  syncFrom: null,
  lastSyncedAt: null,
  connectionCreatedAt: new Date("2026-11-19T07:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  previewContext.mockResolvedValue({ target, client });
});

describe("previewBankSync", () => {
  it("reads from the chosen day with PSU headers and groups the movements", async () => {
    const res = await previewBankSync(ba, "2026-11-01");
    expect(previewContext).toHaveBeenCalledWith({ userId: "user-1", bankAccountId: ba, psu: { ipAddress: "203.0.113.5", userAgent: "UA" } });
    expect(client.getTransactions).toHaveBeenCalledWith("u1", "2026-11-01");
    expect(res.preview?.items.map((i) => [i.ref, i.group])).toEqual([
      ["c", "new"],
      ["b", "new"],
      ["a", "matched"],
    ]);
    expect(res.preview?.balance).toEqual({ cents: 10000, date: "2026-11-20" });
  });

  it("rejects bad input, future days and accounts no longer pending", async () => {
    expect((await previewBankSync("x", "2026-11-01")).ok).toBe(false);
    expect((await previewBankSync(ba, "2026-12-01")).message).toMatch(/futura/);
    previewContext.mockResolvedValueOnce(null);
    expect((await previewBankSync(ba, "2026-11-01")).message).toMatch(/già attivo/);
  });

  it("explains a bank that does not answer", async () => {
    client.getTransactions.mockRejectedValueOnce(new Error("boom"));
    expect((await previewBankSync(ba, "2026-11-01")).message).toMatch(/non ha risposto/);
  });
});

describe("confirmBankSync", () => {
  it("writes chosen movements, excludes the others and stores the balance", async () => {
    rpc.mockResolvedValue({ error: null });
    const res = await confirmBankSync(ba, "2026-11-01", ["c"]);
    expect(res).toMatchObject({ ok: true, message: "Importato 1 movimento. Da ora il conto si aggiorna da solo." });
    expect(rpc.mock.calls[0][0]).toBe("confirm_bank_sync");
    const args = rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_bank_account: ba, p_from: "2026-11-01", p_balance_cents: 10000, p_balance_on: "2026-11-20" });
    expect(args.p_decisions.map((d: { type: string; ref: string }) => [d.type, d.ref])).toEqual([
      ["reconcile", "a"],
      ["exclude", "b"],
      ["insert", "c"],
    ]);
  });

  it("reports an account confirmed meanwhile", async () => {
    rpc.mockResolvedValue({ error: { code: "P0002", message: "x" } });
    expect((await confirmBankSync(ba, "2026-11-01", [])).message).toMatch(/già attivo/);
  });

  it("validates the selection and the category picks", async () => {
    expect((await confirmBankSync(ba, "2026-11-01", ["x".repeat(121)])).ok).toBe(false);
    expect((await confirmBankSync(ba, "2026-11-01", ["c"], [["c", "not-a-uuid"]])).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("replays category picks and remembers them for the account", async () => {
    rpc.mockResolvedValue({ error: null });
    await confirmBankSync(ba, "2026-11-01", ["b", "c"], [["c", CAT], ["b", OTHER]]);
    const inserts = rpc.mock.calls[0][1].p_decisions.filter((d: { type: string }) => d.type === "insert");
    // A category of the wrong direction is dropped.
    expect(inserts.map((d: { ref: string; category_id: string | null }) => [d.ref, d.category_id])).toEqual([
      ["b", null],
      ["c", CAT],
    ]);
    expect(applyCategoryChoice).toHaveBeenCalledTimes(1);
    expect(applyCategoryChoice).toHaveBeenCalledWith(expect.anything(), { householdId: "h1", accountId: "acc1", description: "Mov c", amountCents: -800, categoryId: CAT });
  });
});
