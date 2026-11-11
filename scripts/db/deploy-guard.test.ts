import { describe, expect, it } from "vitest";
import { migrationDecision } from "./deploy-guard.ts";

describe("migrationDecision", () => {
  it("runs outside Vercel and in Vercel production", () => {
    expect(migrationDecision({})).toEqual({ run: true });
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "production" })).toEqual({ run: true });
  });

  it("skips Vercel previews and development builds", () => {
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "preview" })).toEqual({ run: false, reason: "Vercel preview deploy: migrations run only in production." });
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "development" }).run).toBe(false);
    expect(migrationDecision({ VERCEL: "1" })).toEqual({ run: false, reason: "Vercel unknown deploy: migrations run only in production." });
  });
});
