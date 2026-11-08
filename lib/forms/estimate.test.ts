import { describe, expect, it } from "vitest";
import { parseEstimateBookingForm } from "./estimate";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseEstimateBookingForm", () => {
  it("parses the amount and defaults the date to today", () => {
    expect(parseEstimateBookingForm(form({ amountCents: "4800" }), "2026-11-30")).toEqual({ ok: true, value: { amountCents: 4800, bookedOn: "2026-11-30" } });
  });

  it("rejects empty amounts and future dates", () => {
    expect(parseEstimateBookingForm(form({ amountCents: "0", bookedOn: "2026-12-01" }), "2026-11-30")).toEqual({
      ok: false,
      errors: { amountCents: "Inserisci un importo maggiore di zero", bookedOn: "La data non può essere nel futuro" },
    });
  });
});
