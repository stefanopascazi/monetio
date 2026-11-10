import { describe, expect, it } from "vitest";
import { redactText, scrubEvent } from "./scrub-event";

describe("redactText", () => {
  it("redacts Postgres row values", () => {
    expect(redactText('duplicate key value violates unique constraint "x": Key (amount, note)=(12.50, affitto) already exists')).toBe(
      'duplicate key value violates unique constraint "x": Key (amount, note)=([redacted]) already exists',
    );
    expect(redactText("Failing row contains (1, 2026-11-10, -40.00).")).toBe("Failing row contains ([redacted]).");
  });

  it("redacts emails, IBANs and euro amounts", () => {
    expect(redactText("invite to mario.rossi@example.it failed")).toBe("invite to [email] failed");
    expect(redactText("IBAN IT60X0542811101000000123456 rejected")).toBe("IBAN [iban] rejected");
    expect(redactText("over budget by 1.250,00 € and € 30")).toBe("over budget by [amount] and [amount]");
  });

  it("leaves ordinary messages alone", () => {
    expect(redactText("Cannot read properties of undefined (reading 'id')")).toBe("Cannot read properties of undefined (reading 'id')");
  });
});

describe("scrubEvent", () => {
  it("drops request body, cookies, query string and headers except user-agent", () => {
    const out = scrubEvent({
      request: { url: "https://app/x?token=abc#f", headers: { cookie: "sb=1", "user-agent": "UA" }, cookies: { sb: "1" }, data: { amount: 5 }, query_string: "token=abc" },
    });
    expect(out.request).toEqual({ url: "https://app/x", headers: { "user-agent": "UA" } });
  });

  it("keeps only the user id", () => {
    expect(scrubEvent({ user: { id: "u1", email: "a@b.it", ip_address: "1.2.3.4" } }).user).toEqual({ id: "u1" });
    expect(scrubEvent({ user: { email: "a@b.it" } }).user).toBeUndefined();
  });

  it("redacts exception values and drops extra", () => {
    const out = scrubEvent({ exception: { values: [{ value: "Key (iban)=(IT60X0542811101000000123456)" }, {}] }, extra: { row: 1 } });
    expect(out.exception?.values).toEqual([{ value: "Key (iban)=([redacted])" }, {}]);
    expect(out.extra).toBeUndefined();
  });

  it("drops stack frame locals", () => {
    const out = scrubEvent({ exception: { values: [{ value: "x", stacktrace: { frames: [{ vars: { amount: 12.5 } }] } }] } });
    expect(out.exception?.values?.[0].stacktrace?.frames?.[0].vars).toBeUndefined();
  });

  it("drops console breadcrumbs and trims the others", () => {
    const out = scrubEvent({
      breadcrumbs: [
        { category: "console", message: "row 12.50 €" },
        { category: "fetch", data: { url: "https://api/x?q=1", method: "GET", status_code: 500, body: "secret" } },
      ],
    });
    expect(out.breadcrumbs).toEqual([{ category: "fetch", data: { method: "GET", status_code: 500, url: "https://api/x" } }]);
  });

  it("does not mutate the input", () => {
    const event = { message: "a@b.it", user: { id: "u", email: "a@b.it" } };
    scrubEvent(event);
    expect(event).toEqual({ message: "a@b.it", user: { id: "u", email: "a@b.it" } });
  });
});
