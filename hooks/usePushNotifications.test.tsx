import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import type { PushSupport } from "@/lib/push/support";

const actions = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
  sendTestNotification: vi.fn(),
}));
const support = vi.hoisted(() => ({ value: "ready" as PushSupport }));

vi.mock("@/app/actions/push", () => actions);
vi.mock("@/lib/push/support", () => ({ pushSupport: () => support.value, readPushEnvironment: () => ({}) }));

const { usePushNotifications } = await import("./usePushNotifications");

const KEY = "AQID_w";
const wrapper = ({ children }: { children: ReactNode }) => <ToastProvider>{children}</ToastProvider>;

function fakeSubscription(endpoint = "https://push.example/1") {
  return { endpoint, toJSON: () => ({ endpoint, keys: { p256dh: "k", auth: "a" } }), unsubscribe: vi.fn(async () => true) };
}

let existing: ReturnType<typeof fakeSubscription> | null;
const subscribe = vi.fn();
const requestPermission = vi.fn();

beforeEach(() => {
  support.value = "ready";
  existing = null;
  subscribe.mockReset().mockImplementation(async () => (existing = fakeSubscription()));
  requestPermission.mockReset().mockResolvedValue("granted");
  Object.values(actions).forEach((fn) => fn.mockReset());
  const pushManager = { getSubscription: vi.fn(async () => existing), subscribe };
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager }) } });
});

afterEach(() => vi.unstubAllGlobals());

describe("usePushNotifications", () => {
  it("reports why push is unavailable", async () => {
    support.value = "ios-install";
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ios-install"));
  });

  it("is unconfigured without a VAPID key", async () => {
    const { result } = renderHook(() => usePushNotifications(""), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("unconfigured"));
  });

  it("detects an existing subscription", async () => {
    existing = fakeSubscription();
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    expect(result.current.status).toBe("ready");
  });

  it("asks permission, subscribes and saves on enable", async () => {
    actions.savePushSubscription.mockResolvedValue({ ok: true, message: "Notifiche attivate su questo dispositivo." });
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => result.current.setEnabled(true));
    expect(requestPermission).toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
    expect(actions.savePushSubscription).toHaveBeenCalledWith({ endpoint: "https://push.example/1", keys: { p256dh: "k", auth: "a" } }, navigator.userAgent);
    expect(result.current.subscribed).toBe(true);
  });

  it("unsubscribes the browser when the server rejects the subscription", async () => {
    actions.savePushSubscription.mockResolvedValue({ ok: false, message: "Iscrizione alle notifiche non valida." });
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => result.current.setEnabled(true));
    expect(existing?.unsubscribe).toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
  });

  it("switches to denied when the user blocks the prompt", async () => {
    requestPermission.mockResolvedValue("denied");
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => result.current.setEnabled(true));
    expect(result.current.status).toBe("denied");
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("removes the subscription on disable", async () => {
    existing = fakeSubscription();
    actions.removePushSubscription.mockResolvedValue({ ok: true, message: "Notifiche disattivate su questo dispositivo." });
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    const sub = existing;
    await act(async () => result.current.setEnabled(false));
    expect(actions.removePushSubscription).toHaveBeenCalledWith("https://push.example/1");
    expect(sub?.unsubscribe).toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
  });

  it("toasts the test notification outcome", async () => {
    actions.sendTestNotification.mockResolvedValue({ ok: true, message: "Notifica di prova in arrivo entro un minuto." });
    const { result } = renderHook(() => usePushNotifications(KEY), { wrapper });
    await act(async () => result.current.sendTest());
    expect(document.querySelector(".mio-toast--success")).toHaveTextContent("Notifica di prova in arrivo");
  });
});
