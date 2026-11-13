import { describe, expect, it } from "vitest";
import { leakingKeys, mergeEnv } from "./env-file";

describe("mergeEnv", () => {
  it("overrides inherited values, keeps the rest and marks the explicit file", () => {
    const env = mergeEnv({ SUPABASE_URL: "https://prod", PATH: "/bin" }, "# local\nSUPABASE_URL=http://localhost:8000\nCRON_SECRET=x\n", ".env.prod");
    expect(env).toEqual({ SUPABASE_URL: "http://localhost:8000", CRON_SECRET: "x", PATH: "/bin", MONETIO_ENV_FILE: ".env.prod" });
  });
});

describe("leakingKeys", () => {
  it("lists non-empty .env.local names the chosen file leaves out", () => {
    const local = "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000\nSUPABASE_URL=http://localhost:8000\nANTHROPIC_API_KEY=\n";
    expect(leakingKeys(local, "SUPABASE_URL=https://prod\n")).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });
});
