import { describe, expect, it } from "vitest";
import { activeSectionTab } from "@/components/common/section-tabs";
import { SETTINGS_HOME, SETTINGS_TABS } from "./settings-tabs";

describe("SETTINGS_TABS", () => {
  it("routes every tab under /impostazioni and lands on the account tab", () => {
    expect(SETTINGS_TABS.every((t) => t.href.startsWith("/impostazioni/"))).toBe(true);
    expect(SETTINGS_HOME).toBe("/impostazioni/account");
  });

  it("highlights the tab of the current route", () => {
    expect(activeSectionTab(SETTINGS_TABS, "/impostazioni/nucleo")).toBe("nucleo");
    expect(activeSectionTab(SETTINGS_TABS, "/impostazioni/app")).toBe("app");
    expect(activeSectionTab(SETTINGS_TABS, "/impostazioni")).toBe("");
  });
});
