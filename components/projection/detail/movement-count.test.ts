import { describe, expect, it } from "vitest";
import { movementCountLabel } from "./movement-count";

describe("movementCountLabel", () => {
  it("counts merged movements and stays empty for one", () => {
    expect(movementCountLabel(3)).toBe("3 movimenti");
    expect(movementCountLabel(1)).toBe("");
    expect(movementCountLabel(0)).toBe("");
  });
});
