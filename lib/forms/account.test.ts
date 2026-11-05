import { describe, expect, it } from "vitest";
import { parseAccountForm } from "./account";

const form = (data: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
};

describe("parseAccountForm", () => {
  it("parses a shared account with negative opening balance", () => {
    const res = parseAccountForm(form({ name: "Carta", type: "checking", visibility: "shared", openingBalanceCents: "1500", openingNegative: "true", openingDate: "2026-11-01" }));
    expect(res).toEqual({ ok: true, value: { name: "Carta", institution: null, type: "checking", visibility: "shared", openingBalanceCents: -1500, openingDate: "2026-11-01" } });
  });

  it("rejects missing name and type", () => {
    const res = parseAccountForm(form({ visibility: "private", openingDate: "2026-11-01" }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(Object.keys(res.errors).sort()).toEqual(["name", "type"]);
  });
});
