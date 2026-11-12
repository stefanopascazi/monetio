import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, mapPrefs, prefsToRow } from "./prefs";

describe("mapPrefs", () => {
  it("uses defaults without a row", () => {
    expect(mapPrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it("maps a stored row", () => {
    const prefs = mapPrefs({
      push_muted_kinds: ["stale_account", "bogus"],
      quiet_start: 22,
      quiet_end: 7,
      due_days: 5,
      stale_days: 30,
      low_balance_cents: { a1: 20000, a2: "x" },
    });
    expect(prefs).toEqual({ pushMutedKinds: ["stale_account"], quietHours: { start: 22, end: 7 }, dueDays: 5, staleDays: 30, lowBalanceCents: { a1: 20000 } });
  });

  it("treats equal or missing quiet hours as off", () => {
    expect(mapPrefs({ quiet_start: 8, quiet_end: 8 }).quietHours).toBeNull();
    expect(mapPrefs({ quiet_start: 8, quiet_end: null }).quietHours).toBeNull();
  });

  it("round-trips through the row shape", () => {
    const prefs = { pushMutedKinds: ["overdue" as const], quietHours: { start: 23, end: 6 }, dueDays: 1, staleDays: 10, lowBalanceCents: { a: -5000 } };
    expect(mapPrefs(prefsToRow(prefs))).toEqual(prefs);
  });
});
