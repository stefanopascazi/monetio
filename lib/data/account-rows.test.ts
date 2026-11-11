import { describe, expect, it } from "vitest";
import { accountFieldError, identifierColumns } from "./account-rows";

describe("identifierColumns", () => {
  it("omits the IBAN when unchanged and writes it otherwise", () => {
    expect(identifierColumns({ iban: undefined, bic: null, cardLast4: [] })).toEqual({ bic: null, card_last4: [] });
    expect(identifierColumns({ iban: null, bic: "BPMOIT22", cardLast4: ["1234"] })).toEqual({ iban: null, bic: "BPMOIT22", card_last4: ["1234"] });
  });
});

describe("accountFieldError", () => {
  it("maps the household IBAN unique violation only", () => {
    expect(accountFieldError({ code: "23505", message: 'duplicate key value violates unique constraint "accounts_household_iban"' })).toHaveProperty("iban");
    expect(accountFieldError({ code: "23505", message: "other" })).toBeNull();
  });
});
