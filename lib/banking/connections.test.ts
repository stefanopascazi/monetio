import { describe, expect, it } from "vitest";
import { awaitsPreview, balanceGap, bankAccountsFor, bankBalancesByAccount, bankBalanceView, projectionPending, consentDaysLeft, isConsentExpired, LINK_OUTCOME_MESSAGE, mapBankConnection } from "./connections";

describe("mapBankConnection", () => {
  it("maps the row and its accounts", () => {
    expect(
      mapBankConnection({
        id: "c1",
        aspsp_name: "Mock ASPSP",
        valid_until: "2027-05-17T00:00:00Z",
        status: "active",
        created_at: "2026-11-18T10:00:00Z",
        last_synced_at: null,
        bank_accounts: [
          {
            id: "a1",
            name: "Conto",
            iban_masked: "IT60 •••• 3456",
            currency: "EUR",
            account_id: null,
            bank_balance_cents: "3214",
            bank_balance_on: null,
            last_synced_at: "2026-11-18T13:19:58Z",
            last_error: null,
            sync_confirmed_at: "2026-11-18T13:19:58Z",
            sync_from: "2026-11-01",
          },
        ],
      }),
    ).toEqual({
      id: "c1",
      bankName: "Mock ASPSP",
      validUntil: "2027-05-17T00:00:00Z",
      status: "active",
      createdAt: "2026-11-18T10:00:00Z",
      lastSyncedAt: null,
      accounts: [
        {
          id: "a1",
          name: "Conto",
          ibanMasked: "IT60 •••• 3456",
          currency: "EUR",
          accountId: null,
          bankBalanceCents: 3214,
          bankBalanceOn: null,
          bankAvailableCents: null,
          pendingMovements: null,
          lastSyncedAt: "2026-11-18T13:19:58Z",
          lastError: null,
          syncConfirmedAt: "2026-11-18T13:19:58Z",
          syncFrom: "2026-11-01",
          syncSlots: null,
        },
      ],
    });
  });

  it("defaults unknown status to active and missing accounts to none", () => {
    const c = mapBankConnection({ id: "c", aspsp_name: "B", valid_until: "", status: "x", created_at: "", last_synced_at: null, bank_accounts: null });
    expect(c.status).toBe("active");
    expect(c.accounts).toEqual([]);
  });
});

describe("consentDaysLeft", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  it("rounds up partial days and never goes negative", () => {
    expect(consentDaysLeft("2026-11-20T09:00:00Z", now)).toBe(2);
    expect(consentDaysLeft("2026-11-01T00:00:00Z", now)).toBe(0);
  });
});

describe("isConsentExpired", () => {
  const now = new Date("2026-11-18T10:00:00Z");
  it("is expired when not active or past its end", () => {
    expect(isConsentExpired({ status: "active", validUntil: "2026-12-01T00:00:00Z" }, now)).toBe(false);
    expect(isConsentExpired({ status: "active", validUntil: "2026-11-01T00:00:00Z" }, now)).toBe(true);
    expect(isConsentExpired({ status: "revoked", validUntil: "2026-12-01T00:00:00Z" }, now)).toBe(true);
  });
});

describe("LINK_OUTCOME_MESSAGE", () => {
  it("covers every outcome the callback can send", () => {
    expect(Object.keys(LINK_OUTCOME_MESSAGE).sort()).toEqual(["collegata", "errore", "negata", "nessun-conto", "scaduta"]);
  });
});

describe("balanceGap", () => {
  it("is the bank balance minus MonetIO's, null when one is unknown", () => {
    expect(balanceGap(3214, -786)).toBe(4000);
    expect(balanceGap(100, 100)).toBe(0);
    expect(balanceGap(null, 100)).toBeNull();
    expect(balanceGap(100, undefined)).toBeNull();
  });
});

describe("bankBalanceView", () => {
  it("explains a lower available balance with pending payments", () => {
    expect(bankBalanceView({ bankBalanceCents: 9719, bankAvailableCents: 8719 }, 9719)).toEqual({ currentCents: 9719, availableCents: 8719, pendingCents: -1000, gapCents: 0 });
  });

  it("uses MonetIO's balance as current when the bank offers only the available one", () => {
    expect(bankBalanceView({ bankBalanceCents: null, bankAvailableCents: 8719 }, 9719)).toEqual({ currentCents: 9719, availableCents: 8719, pendingCents: -1000, gapCents: null });
  });

  it("keeps a booked mismatch as a gap and no pending without an available balance", () => {
    expect(bankBalanceView({ bankBalanceCents: 3214, bankAvailableCents: null }, -786)).toEqual({ currentCents: 3214, availableCents: null, pendingCents: null, gapCents: 4000 });
  });
});

describe("awaitsPreview", () => {
  it("is true only for linked accounts not confirmed yet", () => {
    expect(awaitsPreview({ accountId: "acc", syncConfirmedAt: null })).toBe(true);
    expect(awaitsPreview({ accountId: "acc", syncConfirmedAt: "2026-11-20T08:00:00Z" })).toBe(false);
    expect(awaitsPreview({ accountId: null, syncConfirmedAt: null })).toBe(false);
  });
});

describe("bankAccountsFor", () => {
  it("finds the bank accounts feeding a MonetIO account across consents", () => {
    const conn = (id: string, accountIds: (string | null)[]) =>
      mapBankConnection({
        id,
        aspsp_name: id,
        valid_until: "",
        status: "active",
        created_at: "",
        last_synced_at: null,
        bank_accounts: accountIds.map((accountId, i) => ({ id: `${id}-${i}`, name: null, iban_masked: null, currency: null, account_id: accountId })),
      });
    const found = bankAccountsFor([conn("c1", ["acc1", null]), conn("c2", ["acc2"])], "acc1");
    expect(found.map((f) => [f.connection.id, f.account.id])).toEqual([["c1", "c1-0"]]);
    expect(bankAccountsFor([conn("c1", [null])], "acc1")).toEqual([]);
  });
});

describe("bankBalancesByAccount", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const conn = (over: { status?: string; valid_until?: string; available?: number | null; booked?: number | null; confirmed?: boolean }) =>
    mapBankConnection({
      id: "c1",
      aspsp_name: "Trade Republic",
      valid_until: over.valid_until ?? "2027-02-19T00:00:00Z",
      status: over.status ?? "active",
      created_at: "",
      last_synced_at: null,
      bank_accounts: [
        {
          id: "ba1",
          name: null,
          iban_masked: null,
          currency: "EUR",
          account_id: "acc1",
          bank_balance_cents: over.booked ?? null,
          bank_available_cents: over.available === undefined ? 8719 : over.available,
          sync_confirmed_at: over.confirmed === false ? null : "2026-11-21T09:00:00Z",
        },
      ],
    });

  it("pairs the booked (or MonetIO) balance with the available one", () => {
    expect(bankBalancesByAccount([conn({})], { acc1: 9719 }, now)).toEqual({ acc1: { currentCents: 9719, availableCents: 8719 } });
    expect(bankBalancesByAccount([conn({ booked: 9800 })], { acc1: 9719 }, now)).toEqual({ acc1: { currentCents: 9800, availableCents: 8719 } });
  });

  it("skips accounts without an available balance, an unconfirmed import or a dead consent", () => {
    expect(bankBalancesByAccount([conn({ available: null })], { acc1: 9719 }, now)).toEqual({});
    expect(bankBalancesByAccount([conn({ confirmed: false })], { acc1: 9719 }, now)).toEqual({});
    expect(bankBalancesByAccount([conn({ status: "expired" })], { acc1: 9719 }, now)).toEqual({});
  });
});

describe("projectionPending", () => {
  const now = new Date("2026-11-24T12:00:00Z");
  const conn = (pending: { amountCents: number; date: string; description: string }[] | null, available = 8719) =>
    mapBankConnection({
      id: "c1",
      aspsp_name: "Trade Republic",
      valid_until: "2027-02-19T00:00:00Z",
      status: "active",
      created_at: "",
      last_synced_at: null,
      bank_accounts: [
        {
          id: "ba1",
          name: null,
          iban_masked: null,
          currency: "EUR",
          account_id: "acc1",
          bank_available_cents: available,
          pending_movements: pending as never,
          sync_confirmed_at: "2026-11-21T09:00:00Z",
        },
      ],
    });

  it("passes listed items with their category and lowers the start by the gap", () => {
    const item = { amountCents: -1000, date: "2026-11-23", description: "POS Esselunga" };
    const res = projectionPending([conn([item])], { acc1: 9719 }, (id, i) => (id === "acc1" && i.description.startsWith("POS") ? "cat-spesa" : null), now);
    expect(res).toEqual({ pending: { acc1: { items: [{ amountCents: -1000, categoryId: "cat-spesa" }] } }, startCents: { acc1: -1000 } });
  });

  it("falls back to the total when the bank lists nothing", () => {
    expect(projectionPending([conn(null)], { acc1: 9719 }, () => null, now)).toEqual({ pending: { acc1: { totalCents: -1000 } }, startCents: { acc1: -1000 } });
  });

  it("ignores accounts whose available balance is not below the booked one", () => {
    expect(projectionPending([conn([], 9719)], { acc1: 9719 }, () => null, now)).toEqual({ pending: {}, startCents: {} });
  });
});
