import { describe, expect, it } from "vitest";
import { activeDataTab, importHref } from "./data-tabs";

describe("activeDataTab", () => {
  it("matches tab routes and nested paths", () => {
    expect(activeDataTab("/dati/importa")).toBe("importa");
    expect(activeDataTab("/dati/storico/x")).toBe("storico");
    expect(activeDataTab("/dati")).toBe("");
    expect(activeDataTab("/dati/importazioni")).toBe("");
  });
});

describe("importHref", () => {
  it("preselects the account when given", () => {
    expect(importHref()).toBe("/dati/importa");
    expect(importHref("a b")).toBe("/dati/importa?conto=a%20b");
  });
});
