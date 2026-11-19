import { describe, expect, it } from "vitest";
import { balanceGap, consentDaysLeft, LINK_OUTCOME_MESSAGE, mapBankConnection } from "./connections";

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
          lastSyncedAt: "2026-11-18T13:19:58Z",
          lastError: null,
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
