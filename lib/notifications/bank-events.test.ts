import { describe, expect, it } from "vitest";
import { bankConsentEvents, bankReviewEvents, consentStep } from "./bank-events";

const now = new Date("2026-11-18T07:00:00Z");
const ctx = { userId: "u1", householdId: "h1", suffix: "", now };
const consent = (validUntil: string, status = "active") => ({ id: "c1", bankName: "Fineco", validUntil, status });
const noReviews = { count: 0, latestAt: null };

describe("consentStep", () => {
  it("maps days left to the reminder step", () => {
    expect(consentStep("2027-01-30T00:00:00Z", "active", now)).toBeNull();
    expect(consentStep("2026-11-30T00:00:00Z", "active", now)).toBe("14");
    expect(consentStep("2026-11-24T00:00:00Z", "active", now)).toBe("7");
    expect(consentStep("2026-11-19T00:00:00Z", "active", now)).toBe("1");
    expect(consentStep("2026-11-17T00:00:00Z", "active", now)).toBe("ended");
    expect(consentStep("2027-01-30T00:00:00Z", "expired", now)).toBe("ended");
  });
});

describe("bankConsentEvents", () => {
  it("reminds once per step, keyed on the consent end", () => {
    const [e] = bankConsentEvents({ consents: [consent("2026-11-24T00:00:00Z")], openReviews: noReviews }, ctx);
    expect(e).toMatchObject({ kind: "bank_consent", dedupKey: "bank_consent:u1:h1:c1:2026-11-24:7", url: "/dati/banche" });
    expect(e.body).toMatch(/Fineco: il consenso scade tra 6 giorni/);
  });

  it("announces the end and ignores revoked or far consents", () => {
    const consents = [
      consent("2026-11-10T00:00:00Z", "expired"),
      { ...consent("2026-11-20T00:00:00Z", "revoked"), id: "c2" },
      { ...consent("2027-03-01T00:00:00Z"), id: "c3" },
    ];
    const events = bankConsentEvents({ consents, openReviews: noReviews }, ctx);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Collegamento banca scaduto");
  });
});

describe("bankReviewEvents", () => {
  it("notifies when new items arrive", () => {
    const [e] = bankReviewEvents({ consents: [], openReviews: { count: 3, latestAt: "2026-11-18T05:00:00Z" } }, ctx);
    expect(e).toMatchObject({ kind: "bank_review", dedupKey: "bank_review:u1:h1:2026-11-18T05:00:00Z" });
    expect(e.body).toMatch(/^3 movimenti della banca aspettano/);
    expect(bankReviewEvents({ consents: [], openReviews: noReviews }, ctx)).toEqual([]);
  });

  it("opens the Banca tab of the account with the newest item", () => {
    const [e] = bankReviewEvents({ consents: [], openReviews: { count: 1, latestAt: "2026-11-18T05:00:00Z", latestAccountId: "acc1" } }, ctx);
    expect(e.url).toBe("/conti/acc1?sezione=banca");
    expect(bankReviewEvents({ consents: [], openReviews: { count: 1, latestAt: "2026-11-18T05:00:00Z" } }, ctx)[0].url).toBe("/conti");
  });
});
