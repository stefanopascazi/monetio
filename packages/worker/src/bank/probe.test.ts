import { describe, expect, it, vi } from "vitest";
import { probeBankAccount, summarizeResponse } from "./probe.ts";

describe("summarizeResponse", () => {
  it("keeps scalars and shrinks lists to count and first item", () => {
    expect(summarizeResponse({ transactions: [{ a: 1 }, { a: 2 }], continuation_key: null })).toEqual({ transactions: { count: 2, first: { a: 1 } }, continuation_key: null });
  });
});

describe("probeBankAccount", () => {
  it("reads details, balances and a year of transactions, reporting errors per call", async () => {
    const getRaw = vi.fn(async (path: string) => {
      if (path.endsWith("/details")) throw Object.assign(new Error("Enable Banking: HTTP 404"), { body: "nope" });
      return { balances: [] };
    });
    const out = await probeBankAccount("u 1", { getRaw }, "2026-11-18");
    expect(getRaw).toHaveBeenCalledWith("/accounts/u%201/transactions?date_from=2025-11-18");
    expect(out.details).toEqual({ error: "Enable Banking: HTTP 404 nope" });
    expect(out.balances).toEqual({ balances: { count: 0, first: null } });
  });
});
