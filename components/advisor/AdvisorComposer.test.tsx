import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { advisorQuota, DEFAULT_LIMITS } from "@/lib/advisor/quota";
import { AdvisorComposer } from "./AdvisorComposer";

vi.mock("next/navigation", () => ({ usePathname: () => "/analisi/proiezioni" }));

describe("AdvisorComposer", () => {
  it("sends a page suggestion with one tap", async () => {
    const onAsk = vi.fn();
    render(<AdvisorComposer turns={0} busy={false} quota={null} onAsk={onAsk} onNew={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Quando il saldo sarà più basso nei prossimi mesi?" }));
    expect(onAsk).toHaveBeenCalledWith("Quando il saldo sarà più basso nei prossimi mesi?", "/analisi/proiezioni");
  });

  it("sends a typed question with the page and clears the box", async () => {
    const onAsk = vi.fn();
    render(<AdvisorComposer turns={1} busy={false} quota={null} onAsk={onAsk} onNew={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox"), "E se aspettiamo un mese?");
    await userEvent.click(screen.getByRole("button", { name: "Invia" }));
    expect(onAsk).toHaveBeenCalledWith("E se aspettiamo un mese?", "/analisi/proiezioni");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("hides suggestions in a running conversation and stops at the turn limit", async () => {
    const onNew = vi.fn();
    const { rerender } = render(<AdvisorComposer turns={2} busy={false} quota={null} onAsk={vi.fn()} onNew={onNew} />);
    expect(screen.queryByLabelText("Domande suggerite")).toBeNull();
    expect(screen.getByLabelText("Continua la conversazione")).toBeInTheDocument();
    rerender(<AdvisorComposer turns={10} busy={false} quota={null} onAsk={vi.fn()} onNew={onNew} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Nuova conversazione" }));
    expect(onNew).toHaveBeenCalled();
  });

  it("shows the counter and blocks when the allowance is used up", () => {
    const { rerender } = render(<AdvisorComposer turns={0} busy={false} quota={advisorQuota({ userToday: 1, householdMonth: 8 }, DEFAULT_LIMITS)} onAsk={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText("Restano 42 domande questo mese")).toBeInTheDocument();
    rerender(<AdvisorComposer turns={0} busy={false} quota={advisorQuota({ userToday: 1, householdMonth: 50 }, DEFAULT_LIMITS)} onAsk={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText(/Avete usato le 50 domande di questo mese/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
