import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { bookEstimate, closeEstimate } from "@/app/actions/estimates";
import { EstimateActions } from "./EstimateActions";

vi.mock("@/app/actions/estimates", () => ({
  bookEstimate: vi.fn(async () => ({ ok: true, message: "Registrato", done: 1 })),
  closeEstimate: vi.fn(async () => ({ ok: true, message: "Eliminata" })),
}));

const wrap = () => render(<ToastProvider><EstimateActions refKey="r:p|2026-11" amountCents={-4800} today="2026-11-30" /></ToastProvider>);

describe("EstimateActions", () => {
  it("asks before dropping the remainder of the estimate", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Elimina stima" }));
    expect(screen.getByText("Elimino quanto resta della stima per questo periodo?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Elimina" }));
    expect(closeEstimate).toHaveBeenCalledWith("r:p|2026-11");
  });

  it("books the remainder with an editable amount defaulting to what is left", async () => {
    const { container } = wrap();
    await userEvent.click(screen.getByRole("button", { name: "Registra movimento" }));
    expect(container.querySelector<HTMLInputElement>('input[name="amountCents"]')?.value).toBe("4800");
    expect(container.querySelector<HTMLInputElement>('input[name="bookedOn"]')?.value).toBe("2026-11-30");
    await userEvent.click(screen.getByRole("button", { name: "Registra" }));
    expect(bookEstimate).toHaveBeenCalled();
    expect(vi.mocked(bookEstimate).mock.calls[0][0]).toBe("r:p|2026-11");
  });

  it("goes back to the actions when the form is cancelled", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Registra movimento" }));
    await userEvent.click(screen.getByRole("button", { name: "Annulla" }));
    expect(screen.getByRole("button", { name: "Registra movimento" })).toBeInTheDocument();
  });
});
