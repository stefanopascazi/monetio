import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdvisorComposer } from "./AdvisorComposer";

vi.mock("next/navigation", () => ({ usePathname: () => "/analisi/proiezioni" }));

describe("AdvisorComposer", () => {
  it("offers page suggestions and sends the question with the page", async () => {
    const onAsk = vi.fn();
    render(<AdvisorComposer turns={0} busy={false} onAsk={onAsk} onNew={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Quando il saldo sarà più basso nei prossimi mesi?" }));
    await userEvent.click(screen.getByRole("button", { name: "Invia" }));
    expect(onAsk).toHaveBeenCalledWith("Quando il saldo sarà più basso nei prossimi mesi?", "/analisi/proiezioni");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("hides suggestions in a running conversation and stops at the turn limit", async () => {
    const onNew = vi.fn();
    const { rerender } = render(<AdvisorComposer turns={2} busy={false} onAsk={vi.fn()} onNew={onNew} />);
    expect(screen.queryByLabelText("Domande suggerite")).toBeNull();
    expect(screen.getByLabelText("Continua la conversazione")).toBeInTheDocument();
    rerender(<AdvisorComposer turns={10} busy={false} onAsk={vi.fn()} onNew={onNew} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Nuova conversazione" }));
    expect(onNew).toHaveBeenCalled();
  });
});
