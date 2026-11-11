import { describe, expect, it } from "vitest";
import { shouldLoadLocalEnv } from "./local-env.ts";

describe("shouldLoadLocalEnv", () => {
  it("loads the stack file locally", () => {
    expect(shouldLoadLocalEnv({}, true)).toBe(true);
  });

  it("never loads it on Vercel or when the file is missing", () => {
    expect(shouldLoadLocalEnv({ VERCEL: "1" }, true)).toBe(false);
    expect(shouldLoadLocalEnv({}, false)).toBe(false);
  });
});
