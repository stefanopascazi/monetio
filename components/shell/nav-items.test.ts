import { describe, expect, it } from "vitest";
import { activeNavId, MORE_ENTRIES, NAV_ENTRIES } from "./nav-items";

describe("activeNavId", () => {
  it("matches sections and nested routes", () => {
    expect(activeNavId("/")).toBe("home");
    expect(activeNavId("/conti")).toBe("conti");
    expect(activeNavId("/conti/abc")).toBe("conti");
    expect(activeNavId("/scadenze")).toBe("scadenze");
    expect(activeNavId("/sconosciuta")).toBe("");
  });

  it("matches secondary sections", () => {
    expect(activeNavId("/proiezioni")).toBe("proiezioni");
    expect(activeNavId("/dati/storico")).toBe("dati");
    expect(activeNavId("/impostazioni")).toBe("impostazioni");
  });
});

describe("entries", () => {
  it("keeps the phone bar at four items and ids unique", () => {
    expect(NAV_ENTRIES).toHaveLength(4);
    const ids = [...NAV_ENTRIES, ...MORE_ENTRIES].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
