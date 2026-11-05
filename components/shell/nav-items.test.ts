import { describe, expect, it } from "vitest";
import { activeNavId } from "./nav-items";

describe("activeNavId", () => {
  it("matches sections and nested routes", () => {
    expect(activeNavId("/")).toBe("home");
    expect(activeNavId("/conti")).toBe("conti");
    expect(activeNavId("/conti/abc")).toBe("conti");
    expect(activeNavId("/impostazioni")).toBe("");
  });
});
