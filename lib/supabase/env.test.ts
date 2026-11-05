import { describe, expect, it } from "vitest";
import { supabaseEnv } from "./env";

describe("supabaseEnv", () => {
  it("prefers public names and falls back to integration names", () => {
    expect(supabaseEnv({ SUPABASE_URL: "u", SUPABASE_PUBLISHABLE_KEY: "k" })).toEqual({ url: "u", key: "k" });
    expect(supabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "p", SUPABASE_URL: "u", NEXT_PUBLIC_SUPABASE_ANON_KEY: "a" })).toEqual({ url: "p", key: "a" });
  });

  it("throws when missing", () => {
    expect(() => supabaseEnv({})).toThrow(/Supabase non configurato/);
  });
});
