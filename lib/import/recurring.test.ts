import { describe, expect, it } from "vitest";
import { detectRecurring } from "./recurring";

const m = (bookedOn: string, amountCents: number, description: string, categoryId: string | null = null) => ({ bookedOn, amountCents, description, categoryId });
const TODAY = "2026-11-11";

describe("detectRecurring", () => {
  it("proposes a monthly rule from three months of the same merchant", () => {
    const res = detectRecurring(
      [m("2026-08-06", -1399, "C/O NETFLIX.COM CARTA 1", "abb"), m("2026-09-06", -1399, "NETFLIX.COM 2"), m("2026-10-07", -1399, "NETFLIX.COM 3", "abb"), m("2026-11-06", -1499, "NETFLIX.COM 4", "abb")],
      [],
      TODAY,
    );
    expect(res).toEqual([
      {
        key: "netflix|-1",
        description: "Netflix",
        amountCents: -1399,
        frequency: "monthly",
        dayOfMonth: 6,
        startDate: "2026-12-06",
        occurrences: 4,
        lastDate: "2026-11-06",
        categoryId: "abb",
      },
    ]);
  });

  it("detects bimonthly bills and starts after the last one", () => {
    const res = detectRecurring([m("2026-05-10", -7000, "HERA luce"), m("2026-07-10", -8000, "HERA luce"), m("2026-09-12", -7500, "HERA luce")], [], TODAY);
    expect(res[0]).toMatchObject({ frequency: "bimonthly", amountCents: -7500, dayOfMonth: 10, startDate: "2026-11-10" });
  });

  it("skips merchants seen in fewer than three months, irregular or stopped ones", () => {
    const res = detectRecurring(
      [
        m("2026-10-01", -500, "Bar Sport"),
        m("2026-11-01", -500, "Bar Sport"),
        m("2026-01-01", -2000, "Palestra"),
        m("2026-02-01", -2000, "Palestra"),
        m("2026-09-01", -2000, "Palestra"),
        m("2022-01-07", -4980, "Linkem"),
        m("2022-03-07", -4980, "Linkem"),
        m("2022-05-07", -4980, "Linkem"),
      ],
      [],
      TODAY,
    );
    expect(res).toEqual([]);
  });

  it("skips commitments an existing rule already covers and keeps income apart", () => {
    const rows = [m("2026-09-27", 210000, "Stipendio ACME"), m("2026-10-27", 210000, "Stipendio ACME"), m("2026-11-27", 215000, "Stipendio ACME")];
    expect(detectRecurring(rows, [{ amountCents: 200000, frequency: "monthly" }], TODAY)).toEqual([]);
    expect(detectRecurring(rows, [{ amountCents: -210000, frequency: "monthly" }], TODAY)[0]).toMatchObject({ amountCents: 210000, frequency: "monthly" });
  });

  it("ignores the account holder's name repeated across merchants", () => {
    const rows = ["LUCEPIU", "ACQUAGAS", "TELEFONIA"].flatMap((who, i) => ["2026-09", "2026-10", "2026-11"].map((mo) => m(`${mo}-0${i + 1}`, -(1000 + i), `ADDEBITO ROSSI MARIO ${who}`)));
    expect(detectRecurring(rows, [], TODAY).map((p) => p.description).sort()).toEqual(["Acquagas", "Lucepiu", "Telefonia"]);
  });

  it("treats a rule naming the same merchant as covering a split bill", () => {
    const rows = ["2026-09-05", "2026-10-05", "2026-11-05"].map((d) => m(d, -2699, "ADDEBITO TELEFONIA UNO S.P.A."));
    expect(detectRecurring(rows, [{ amountCents: -3598, frequency: "monthly", description: "Telefonia Uno" }], TODAY)).toEqual([]);
    expect(detectRecurring(rows, [{ amountCents: -3598, frequency: "monthly", description: "Palestra" }], TODAY)).toHaveLength(1);
  });
});
