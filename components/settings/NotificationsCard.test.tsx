import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushNotificationsState } from "@/hooks/usePushNotifications";

const state = vi.hoisted(() => ({ current: {} as PushNotificationsState }));
vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: () => state.current }));

const { NotificationsCard } = await import("./NotificationsCard");

const base = (): PushNotificationsState => ({ status: "ready", subscribed: false, pending: false, setEnabled: vi.fn(), sendTest: vi.fn() });

beforeEach(() => {
  state.current = base();
});

describe("NotificationsCard", () => {
  it("toggles notifications on", async () => {
    render(<NotificationsCard />);
    await userEvent.click(screen.getByRole("switch", { name: "Notifiche su questo dispositivo" }));
    expect(state.current.setEnabled).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("button", { name: /prova/ })).not.toBeInTheDocument();
  });

  it("offers a test notification once subscribed", async () => {
    state.current = { ...base(), subscribed: true };
    render(<NotificationsCard />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("button", { name: "Invia notifica di prova" }));
    expect(state.current.sendTest).toHaveBeenCalled();
  });

  it("explains the iOS Home screen requirement instead of the toggle", () => {
    state.current = { ...base(), status: "ios-install" };
    render(<NotificationsCard />);
    expect(screen.getByText(/schermata Home/)).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("tells how to unblock denied notifications", () => {
    state.current = { ...base(), status: "denied" };
    render(<NotificationsCard />);
    expect(screen.getByRole("alert")).toHaveTextContent(/bloccato le notifiche/);
  });

  it("keeps the toggle disabled until checked", () => {
    state.current = { ...base(), status: null };
    render(<NotificationsCard />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
