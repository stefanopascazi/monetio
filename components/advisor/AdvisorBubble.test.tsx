import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdvisorBubble } from "./AdvisorBubble";

const nav = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
const shell = vi.hoisted(() => ({ enabled: true, panelOpen: false, setPanelOpen: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));
vi.mock("./AdvisorProvider", () => ({ useAdvisor: () => shell }));

const OPEN = "Apri l'assistente";

function setWide(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = "/";
  Object.assign(shell, { enabled: true, panelOpen: false });
});

describe("AdvisorBubble", () => {
  it("opens the side panel on wide screens", async () => {
    setWide(true);
    render(<AdvisorBubble />);
    await userEvent.click(screen.getByRole("button", { name: OPEN }));
    expect(shell.setPanelOpen).toHaveBeenCalledWith(true);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("goes to the chat page on phones", async () => {
    setWide(false);
    render(<AdvisorBubble />);
    await userEvent.click(screen.getByRole("button", { name: OPEN }));
    expect(nav.push).toHaveBeenCalledWith("/chiedi");
  });

  it("hides when off, with the panel open or on the chat page", () => {
    shell.enabled = false;
    const { rerender } = render(<AdvisorBubble />);
    expect(screen.queryByRole("button")).toBeNull();
    Object.assign(shell, { enabled: true, panelOpen: true });
    rerender(<AdvisorBubble />);
    expect(screen.queryByRole("button")).toBeNull();
    shell.panelOpen = false;
    nav.pathname = "/chiedi";
    rerender(<AdvisorBubble />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
