import { describe, expect, it } from "vitest";
import { emptyReport, REPORT_MARKER, reportLine } from "./report";

describe("reportLine", () => {
  it("prints one marked JSON line", () => {
    const line = reportLine({ ...emptyReport(), ok: true, backup: "manual/x.age", counts: { households: 2 } });
    expect(line.startsWith(REPORT_MARKER)).toBe(true);
    expect(line).not.toContain("\n");
    expect(JSON.parse(line.slice(REPORT_MARKER.length))).toMatchObject({ ok: true, backup: "manual/x.age", counts: { households: 2 }, error: null });
  });

  it("keeps a long error short and on one line", () => {
    const line = reportLine({ ...emptyReport(), error: "x\n".repeat(400) });
    expect(line).not.toContain("\n");
    expect(JSON.parse(line.slice(REPORT_MARKER.length)).error).toHaveLength(500);
  });
});
