import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { DEFAULT_PREFS } from "@/lib/notifications/prefs";

const save = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "Preferenze salvate.", done: 1 })));
vi.mock("@/app/actions/notifications", () => ({ saveNotificationPrefs: save }));

const { NotificationPrefsForm } = await import("./NotificationPrefsForm");

const ACC = "11111111-2222-3333-4444-555555555555";

function renderForm(prefs = DEFAULT_PREFS) {
  const utils = render(
    <ToastProvider>
      <NotificationPrefsForm prefs={prefs} accounts={[{ id: ACC, name: "Conto comune" }]} />
    </ToastProvider>,
  );
  const form = utils.container.querySelector("form")!;
  return { ...utils, form };
}

describe("NotificationPrefsForm", () => {
  it("submits push mutes and thresholds through hidden fields", async () => {
    const { form } = renderForm({ ...DEFAULT_PREFS, lowBalanceCents: { [ACC]: 20000 } });
    await userEvent.click(screen.getByRole("button", { name: /Preferenze notifiche/ }));
    await userEvent.click(screen.getByRole("switch", { name: "Conti da aggiornare" }));
    const fd = new FormData(form);
    expect(fd.getAll("pushMuted")).toEqual(["stale_account"]);
    expect(fd.get(`lowCents:${ACC}`)).toBe("20000");
    expect(fd.get("dueDays")).toBe("3");
    expect(fd.get("quietStart")).toBeNull();
  });

  it("shows the quiet hours pickers when turned on", async () => {
    const { form } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Preferenze notifiche/ }));
    await userEvent.click(screen.getByRole("switch", { name: "Orario silenzioso" }));
    const fd = new FormData(form);
    expect(fd.get("quietStart")).toBe("22");
    expect(fd.get("quietEnd")).toBe("7");
  });

  it("saves through the server action", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Preferenze notifiche/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salva preferenze" }));
    expect(save).toHaveBeenCalled();
  });
});
