import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { EnableBankingError } from "../../../../lib/banking/enable-banking/client.ts";
import { sealSecret } from "../../../../lib/banking/secrets.ts";
import type { BankSyncStore, BankSyncTarget } from "../bank/store.ts";
import { createBankSyncJob, learnedSyncSlots, syncErrorMessage } from "./bank-sync.ts";

const masterKey = randomBytes(32);
const now = new Date("2026-11-18T11:00:00Z");

const target = (over: Partial<BankSyncTarget>): BankSyncTarget => ({
  bankAccountId: "ba1",
  uid: "u1",
  userId: "user-1",
  householdId: "h1",
  accountId: "acc1",
  openingDate: "2026-01-01",
  syncFrom: null,
  lastSyncedAt: null,
  connectionCreatedAt: now,
  appId: "app-1",
  privateKeySealed: sealSecret("PEM-1", masterKey, "user-1"),
  syncSlots: null,
  ...over,
});

function setup(targets: BankSyncTarget[], at: Date = now) {
  const store: BankSyncStore = {
    expireConnections: vi.fn(async () => 1),
    listTargets: vi.fn(async () => targets),
    loadExisting: vi.fn(async () => ({ candidates: [], reviewRefs: [] })),
    apply: vi.fn(async () => {}),
    saveStatus: vi.fn(async () => {}),
    limitSyncSlots: vi.fn(async () => {}),
  };
  const client = {
    getBalances: vi.fn(async () => []),
    getTransactions: vi.fn(async () => [
      { entry_reference: "r1", booking_date: "2026-11-17", transaction_amount: { currency: "EUR", amount: "3.00" }, credit_debit_indicator: "DBIT" as const },
    ]),
  };
  const createClient = vi.fn(() => client);
  const log = vi.fn();
  const job = createBankSyncJob({ store, masterKey, createClient });
  const run = () => job.run({ log, signal: new AbortController().signal, now: at });
  return { store, client, createClient, log, run, job };
}

describe("bank-sync job", () => {
  it("opens each owner's key once and syncs every linked account", async () => {
    const { store, createClient, log, run } = setup([target({}), target({ bankAccountId: "ba2", uid: "u2", accountId: "acc2" })]);
    await run();
    expect(store.expireConnections).toHaveBeenCalledWith(now);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith({ appId: "app-1", privateKeyPem: "PEM-1" });
    expect(store.apply).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("info", "bank account synced", expect.objectContaining({ bankAccount: "ba1", fetched: 1, balances: 0 }));
    expect(log).toHaveBeenCalledWith("info", "bank sync done", expect.objectContaining({ accounts: 2, inserted: 2, failed: 0, expired: 1 }));
  });

  it("records the error on the failing account and goes on with the others", async () => {
    const { store, client, run } = setup([target({}), target({ bankAccountId: "ba2", uid: "u2" })]);
    client.getTransactions.mockRejectedValueOnce(new EnableBankingError(401, "expired"));
    await run();
    expect(store.saveStatus).toHaveBeenCalledWith("ba1", { syncedAt: now, balance: null, error: "Consenso non più valido: collega di nuovo la banca." });
    expect(store.apply).toHaveBeenCalledTimes(1);
  });

  it("rethrows schema errors during a deploy", async () => {
    const { store, run } = setup([target({})]);
    vi.mocked(store.loadExisting).mockRejectedValueOnce(Object.assign(new Error("missing"), { code: "42P01" }));
    await expect(run()).rejects.toThrow("missing");
  });

  it("runs at 8, 12, 18 and 23 Rome time", () => {
    const { job } = setup([]);
    // Winter: 12:00 Rome is 11:00 UTC.
    expect(job.isDue!(new Date("2026-11-18T07:30:00Z"), new Date("2026-11-18T10:59:00Z"))).toBe(false);
    expect(job.isDue!(new Date("2026-11-18T07:30:00Z"), new Date("2026-11-18T11:00:00Z"))).toBe(true);
  });
});

describe("syncErrorMessage", () => {
  it("explains rate limits, bad keys and outages", () => {
    expect(syncErrorMessage(new EnableBankingError(429, ""))).toMatch(/Limite/);
    expect(syncErrorMessage(new Error("Unsupported state or unable to authenticate data"))).toMatch(/Chiave/);
    expect(syncErrorMessage(new Error("ECONNRESET"))).toMatch(/non raggiungibile/);
  });

  it("learns a daily read limit from a 429 after earlier syncs of the day", async () => {
    // 18:05 Rome: the 8 and 12 syncs already used the bank's reads.
    const { store, client, log, run } = setup([target({})], new Date("2026-11-18T17:05:00Z"));
    client.getBalances.mockRejectedValueOnce(new EnableBankingError(429, "limit"));
    await run();
    expect(store.limitSyncSlots).toHaveBeenCalledWith("ba1", 2);
    expect(store.saveStatus).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("warn", "bank read limit learned", expect.objectContaining({ bankAccount: "ba1", syncSlots: 2 }));
  });

  it("keeps a 429 on the first sync of the day as an error", async () => {
    const { store, client, run } = setup([target({})], new Date("2026-11-18T07:05:00Z"));
    client.getBalances.mockRejectedValueOnce(new EnableBankingError(429, "limit"));
    await run();
    expect(store.limitSyncSlots).not.toHaveBeenCalled();
    expect(store.saveStatus).toHaveBeenCalledWith("ba1", expect.objectContaining({ error: "Limite di letture della banca raggiunto: riprovo al prossimo giro." }));
  });

  it("skips accounts outside their allowed slots", async () => {
    // 12:05 Rome: an account limited to 2 syncs uses only 8 and 18.
    const { store, run } = setup([target({ syncSlots: 2 }), target({ bankAccountId: "ba2", uid: "u2" })], new Date("2026-11-18T11:05:00Z"));
    await run();
    expect(store.apply).toHaveBeenCalledTimes(1);
    expect(store.apply).toHaveBeenCalledWith(expect.objectContaining({ bankAccountId: "ba2" }), expect.anything());
  });
});

describe("learnedSyncSlots", () => {
  it("counts the slots already used today", () => {
    expect(learnedSyncSlots(null, 18)).toBe(2);
    expect(learnedSyncSlots(null, 23)).toBe(3);
    expect(learnedSyncSlots(2, 18)).toBe(1);
    expect(learnedSyncSlots(null, 8)).toBeNull();
  });
});
