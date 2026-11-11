import { describe, expect, it } from "vitest";
import { activeNavId, NAV_ENTRIES } from "./nav-items";

describe("activeNavId", () => {
  it("matches sections and nested routes", () => {
    expect(activeNavId("/")).toBe("home");
    expect(activeNavId("/conti")).toBe("conti");
    expect(activeNavId("/conti/abc")).toBe("conti");
    expect(activeNavId("/impostazioni")).toBe("");
    expect(activeNavId("/dati/storico")).toBe("dati");
  });

  it("keeps the phone bar at five items", () => {
    expect(NAV_ENTRIES.filter((e) => !e.railOnly)).toHaveLength(5);
  });
});
