import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("../supabase/server", () => ({ createClient: vi.fn() }));

const { bookDuePlanned } = await import("./sync");

/** Query builder recording the chained filters, resolving to `result`. */
function fakeAdmin(result: { data: unknown; error: unknown }) {
  const calls: [string, ...unknown[]][] = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["from", "update", "eq", "lte", "select"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return m === "select" ? Promise.resolve(result) : builder;
    };
  }
  return { admin: builder as unknown as SupabaseClient, calls };
}

describe("bookDuePlanned", () => {
  it("books the household's planned rows dated today or earlier", async () => {
    const { admin, calls } = fakeAdmin({ data: [{ id: "a" }, { id: "b" }], error: null });
    expect(await bookDuePlanned(admin, "h1", "2026-11-16")).toBe(2);
    expect(calls).toEqual([
      ["from", "transactions"],
      ["update", { status: "booked" }],
      ["eq", "household_id", "h1"],
      ["eq", "status", "planned"],
      ["lte", "booked_on", "2026-11-16"],
      ["select", "id"],
    ]);
  });

  it("throws database errors", async () => {
    const { admin } = fakeAdmin({ data: null, error: new Error("boom") });
    await expect(bookDuePlanned(admin, "h1", "2026-11-16")).rejects.toThrow("boom");
  });
});
