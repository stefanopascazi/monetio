import { describe, expect, it } from "vitest";
import { WORKER_RELEASE } from "./release.ts";

describe("WORKER_RELEASE", () => {
  it("is undefined outside the bundled build", () => {
    expect(WORKER_RELEASE).toBeUndefined();
  });
});
