import { describe, expect, it } from "vitest";
import { mapInboxItem, receivedLabel, unreadBadge } from "./inbox";

describe("mapInboxItem", () => {
  it("maps a row and its read state", () => {
    const row = { id: "n1", title: "Scadenza domani", body: "Luce", url: "/scadenze", created_at: "2026-11-12T07:00:00Z", read_at: null };
    expect(mapInboxItem(row)).toEqual({ id: "n1", title: "Scadenza domani", body: "Luce", url: "/scadenze", createdAt: "2026-11-12T07:00:00Z", read: false });
    expect(mapInboxItem({ ...row, read_at: "2026-11-12T08:00:00Z" }).read).toBe(true);
  });

  it("only keeps same-origin paths", () => {
    expect(mapInboxItem({ id: "n", title: "t", url: "//evil.example" }).url).toBe("/");
    expect(mapInboxItem({ id: "n", title: "t", url: "https://evil.example" }).url).toBe("/");
  });
});

describe("receivedLabel", () => {
  it("speaks in days", () => {
    expect(receivedLabel("2026-11-12", "2026-11-12")).toBe("Oggi");
    expect(receivedLabel("2026-11-11", "2026-11-12")).toBe("Ieri");
    expect(receivedLabel("2026-11-02", "2026-11-12")).toBe("10 giorni fa");
  });
});

describe("unreadBadge", () => {
  it("hides zero and caps large counts", () => {
    expect(unreadBadge(0)).toBeNull();
    expect(unreadBadge(7)).toBe("7");
    expect(unreadBadge(120)).toBe("99+");
  });
});
