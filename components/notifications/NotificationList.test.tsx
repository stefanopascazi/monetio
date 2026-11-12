import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";

const push = vi.fn();
const actions = vi.hoisted(() => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/actions/notifications", () => actions);

const { NotificationList } = await import("./NotificationList");

const item = (id: string, read: boolean, createdOn = "2026-11-12") => ({
  id,
  title: `Titolo ${id}`,
  body: `Testo ${id}`,
  url: `/scadenze#${id}`,
  createdAt: `${createdOn}T07:00:00Z`,
  createdOn,
  read,
});

const renderList = (items = [item("a", false), item("b", true, "2026-11-10")]) =>
  render(
    <ToastProvider>
      <NotificationList items={items} today="2026-11-12" />
    </ToastProvider>,
  );

beforeEach(() => {
  push.mockReset();
  actions.markNotificationRead.mockReset().mockResolvedValue({ ok: true });
  actions.markAllNotificationsRead.mockReset().mockResolvedValue({ ok: true, message: "Tutte le notifiche sono segnate come lette." });
});

describe("NotificationList", () => {
  it("shows unread state and when each arrived", () => {
    renderList();
    expect(screen.getByRole("button", { name: /Titolo a \(da leggere\)/ })).toHaveTextContent("Oggi");
    expect(screen.getByRole("button", { name: /Titolo b/ })).toHaveTextContent("2 giorni fa");
  });

  it("marks an unread notification read and opens its page", async () => {
    renderList();
    await userEvent.click(screen.getByRole("button", { name: /Titolo a/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/scadenze#a"));
    expect(actions.markNotificationRead).toHaveBeenCalledWith("a");
  });

  it("opens a read notification without marking it again", async () => {
    renderList();
    await userEvent.click(screen.getByRole("button", { name: /Titolo b/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/scadenze#b"));
    expect(actions.markNotificationRead).not.toHaveBeenCalled();
  });

  it("marks all read", async () => {
    renderList();
    await userEvent.click(screen.getByRole("button", { name: "Segna tutte come lette" }));
    await waitFor(() => expect(actions.markAllNotificationsRead).toHaveBeenCalled());
  });

  it("hides mark-all when everything is read", () => {
    renderList([item("b", true)]);
    expect(screen.queryByRole("button", { name: "Segna tutte come lette" })).toBeNull();
  });
});
