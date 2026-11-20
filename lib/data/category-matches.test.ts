import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { applyCategoryChoice, followsMatch, listUncategorised } = await import("./category-matches");

type Op = [string, ...unknown[]];
type Handler = (table: string, ops: Op[]) => unknown;

/** Chainable stand-in for the Supabase query builder: records each call, answers through `handler`. */
function fakeClient(handler: Handler) {
  const calls: { table: string; ops: Op[] }[] = [];
  const from = (table: string) => {
    const ops: Op[] = [];
    calls.push({ table, ops });
    const builder: object = new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") return (ok: (v: unknown) => void, ko: (e: unknown) => void) => Promise.resolve(handler(table, ops)).then(ok, ko);
          if (prop === "maybeSingle") return () => Promise.resolve(handler(table, [...ops, ["maybeSingle"]]));
          return (...args: unknown[]) => {
            ops.push([prop, ...args]);
            return builder;
          };
        },
      },
    );
    return builder;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: { from } as any, calls };
}

const has = (ops: Op[], name: string) => ops.some(([op]) => op === name);
const choice = { householdId: "h1", accountId: "acc1", description: "Netflix 06/11", amountCents: -1399, categoryId: "new" };

describe("applyCategoryChoice", () => {
  it("remembers the match and updates identical uncategorised movements or those on the old match", async () => {
    const { client, calls } = fakeClient((table, ops) => {
      if (table === "account_category_matches" && has(ops, "maybeSingle")) return { data: { category_id: "old" }, error: null };
      if (table === "account_category_matches") return { error: null };
      if (has(ops, "update")) return { error: null };
      return {
        data: [
          { id: "t1", description: "NETFLIX", amount_cents: -1399, category_id: null },
          { id: "t2", description: "Netflix 06/10", amount_cents: -1399, category_id: "old" },
          { id: "t3", description: "Netflix premium", amount_cents: -1999, category_id: null },
        ],
        error: null,
      };
    });
    expect(await applyCategoryChoice(client, choice)).toBe(2);
    const upsert = calls.find((c) => has(c.ops, "upsert"))!.ops.find(([op]) => op === "upsert")!;
    expect(upsert[1]).toMatchObject({ household_id: "h1", account_id: "acc1", description_key: "netflix", direction: -1, category_id: "new", sample_description: "Netflix 06/11" });
    const read = calls.find((c) => c.table === "transactions" && has(c.ops, "select"))!.ops;
    expect(read).toContainEqual(["or", "category_id.is.null,category_id.eq.old"]);
    expect(read).toContainEqual(["lte", "amount_cents", 0]);
    const update = calls.find((c) => has(c.ops, "update"))!.ops;
    expect(update).toContainEqual(["update", { category_id: "new" }]);
    expect(update).toContainEqual(["in", "id", ["t1", "t2"]]);
  });

  it("only fills uncategorised movements when there was no match", async () => {
    const { client, calls } = fakeClient((table, ops) => {
      if (has(ops, "maybeSingle")) return { data: null, error: null };
      if (table === "transactions" && has(ops, "select")) return { data: [], error: null };
      return { error: null };
    });
    expect(await applyCategoryChoice(client, { ...choice, amountCents: 5000 })).toBe(0);
    const read = calls.find((c) => c.table === "transactions")!.ops;
    expect(read).toContainEqual(["is", "category_id", null]);
    expect(read).toContainEqual(["gt", "amount_cents", 0]);
    expect(calls.some((c) => has(c.ops, "update"))).toBe(false);
  });

  it("does nothing for descriptions made only of codes", async () => {
    const { client, calls } = fakeClient(() => ({ error: null }));
    expect(await applyCategoryChoice(client, { ...choice, description: "000123" })).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("followsMatch", () => {
  it("follows uncategorised movements and those on the matched category", async () => {
    const { client } = fakeClient(() => ({ data: { category_id: "old" }, error: null }));
    expect(await followsMatch(client, "acc1", "Netflix", -1, null)).toBe(true);
    expect(await followsMatch(client, "acc1", "Netflix", -1, "old")).toBe(true);
    expect(await followsMatch(client, "acc1", "Netflix", -1, "manual")).toBe(false);
  });
});

describe("listUncategorised", () => {
  it("reads booked plain income/expense without category", async () => {
    const { client, calls } = fakeClient(() => ({ data: [{ description: "Bar", amount_cents: -300, booked_on: "2026-11-01" }], error: null }));
    expect(await listUncategorised(client, "acc1")).toEqual([{ description: "Bar", amountCents: -300, bookedOn: "2026-11-01" }]);
    expect(calls[0].ops).toContainEqual(["is", "category_id", null]);
    expect(calls[0].ops).toContainEqual(["eq", "status", "booked"]);
  });
});
