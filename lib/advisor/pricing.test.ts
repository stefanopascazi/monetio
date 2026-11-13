import { describe, expect, it } from "vitest";
import { addUsage, costMicroUsd, EMPTY_USAGE } from "./pricing";

const usage = { inputTokens: 10_000, outputTokens: 1_000, cacheReadTokens: 50_000, cacheWriteTokens: 2_000 };

describe("costMicroUsd", () => {
  it("prices each token class at the model's list price", () => {
    // 10k x 4 + 1k x 20 + 50k x 0.2 + 2k x 5 = 80.000 micro-dollars (0,08 $).
    expect(costMicroUsd("claude-opus-5-5", usage)).toBe(80_000);
    expect(costMicroUsd("claude-sonnet-5-5", usage)).toBe(40_000);
  });

  it("returns null for an unknown model", () => {
    expect(costMicroUsd("claude-x", usage)).toBeNull();
  });
});

describe("addUsage", () => {
  it("adds every counter", () => {
    expect(addUsage(addUsage(EMPTY_USAGE, usage), usage)).toEqual({ inputTokens: 20_000, outputTokens: 2_000, cacheReadTokens: 100_000, cacheWriteTokens: 4_000 });
  });
});
