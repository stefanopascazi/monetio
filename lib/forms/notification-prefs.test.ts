import { describe, expect, it } from "vitest";
import { LOW_PREFIX, parsePrefsForm } from "./notification-prefs";

const ACC = "11111111-2222-3333-4444-555555555555";

function form(fields: [string, string][]) {
  const fd = new FormData();
  for (const [k, v] of fields) fd.append(k, v);
  return fd;
}

const base: [string, string][] = [
  ["dueDays", "3"],
  ["staleDays", "14"],
];

describe("parsePrefsForm", () => {
  it("parses muted kinds, days and thresholds", () => {
    const res = parsePrefsForm(form([...base, ["pushMuted", "stale_account"], ["pushMuted", "bogus"], [LOW_PREFIX + ACC, "25000"], [LOW_PREFIX + "not-a-uuid", "100"]]));
    expect(res).toEqual({ ok: true, value: { pushMutedKinds: ["stale_account"], quietHours: null, dueDays: 3, staleDays: 14, lowBalanceCents: { [ACC]: 25000 } } });
  });

  it("drops empty or zero thresholds (back to the default)", () => {
    const res = parsePrefsForm(form([...base, [LOW_PREFIX + ACC, ""]]));
    expect(res.ok && res.value.lowBalanceCents).toEqual({});
  });

  it("reads quiet hours", () => {
    const res = parsePrefsForm(form([...base, ["quietStart", "22"], ["quietEnd", "7"]]));
    expect(res.ok && res.value.quietHours).toEqual({ start: 22, end: 7 });
  });

  it("rejects equal or invalid quiet hours", () => {
    expect(parsePrefsForm(form([...base, ["quietStart", "8"], ["quietEnd", "8"]]))).toMatchObject({ ok: false, errors: { quietEnd: expect.any(String) } });
    expect(parsePrefsForm(form([...base, ["quietStart", "25"], ["quietEnd", "7"]]))).toMatchObject({ ok: false, errors: { quietStart: expect.any(String) } });
  });

  it("validates day ranges", () => {
    expect(parsePrefsForm(form([["dueDays", "20"], ["staleDays", "14"]]))).toMatchObject({ ok: false, errors: { dueDays: expect.any(String) } });
    expect(parsePrefsForm(form([["dueDays", "3"], ["staleDays", "1"]]))).toMatchObject({ ok: false, errors: { staleDays: expect.any(String) } });
  });

  it("rejects malformed amounts", () => {
    expect(parsePrefsForm(form([...base, [LOW_PREFIX + ACC, "-5"]]))).toMatchObject({ ok: false });
  });
});
