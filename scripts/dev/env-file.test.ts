import { describe, expect, it } from "vitest";
import { mergeEnv } from "./env-file";

describe("mergeEnv", () => {
  it("overrides inherited values and keeps the rest", () => {
    const env = mergeEnv({ SUPABASE_URL: "https://prod", PATH: "/bin" }, "# local\nSUPABASE_URL=http://localhost:8000\nCRON_SECRET=x\n");
    expect(env).toEqual({ SUPABASE_URL: "http://localhost:8000", CRON_SECRET: "x", PATH: "/bin" });
  });
});
