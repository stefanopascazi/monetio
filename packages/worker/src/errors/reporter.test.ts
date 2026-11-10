import { describe, expect, it } from "vitest";
import { noopReporter } from "./reporter.ts";

describe("noopReporter", () => {
  it("accepts errors and flushes without side effects", async () => {
    expect(() => noopReporter.capture(new Error("x"), { job: "demo" })).not.toThrow();
    await expect(noopReporter.flush(10)).resolves.toBeUndefined();
  });
});
