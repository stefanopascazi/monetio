import { describe, expect, it } from "vitest";
import { activeSectionTab } from "./section-tabs";

const tabs = [
  { id: "a", label: "A", href: "/s/a" },
  { id: "b", label: "B", href: "/s/b" },
];

describe("activeSectionTab", () => {
  it("matches tab routes and nested paths only", () => {
    expect(activeSectionTab(tabs, "/s/a")).toBe("a");
    expect(activeSectionTab(tabs, "/s/b/x")).toBe("b");
    expect(activeSectionTab(tabs, "/s")).toBe("");
    expect(activeSectionTab(tabs, "/s/ab")).toBe("");
  });
});
