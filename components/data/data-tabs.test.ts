import { describe, expect, it } from "vitest";
import { activeDataTab } from "./data-tabs";

describe("activeDataTab", () => {
  it("matches tab routes and nested paths", () => {
    expect(activeDataTab("/dati/importa")).toBe("importa");
    expect(activeDataTab("/dati/storico/x")).toBe("storico");
    expect(activeDataTab("/dati")).toBe("");
    expect(activeDataTab("/dati/importazioni")).toBe("");
  });
});
