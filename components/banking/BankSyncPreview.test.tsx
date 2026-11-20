import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { confirmBankSync, previewBankSync } from "@/app/actions/bank-sync";
import type { SyncPreview } from "@/lib/banking/sync/preview";
import { BankSyncPreview } from "./BankSyncPreview";

vi.mock("@/app/actions/bank-sync", () => ({ previewBankSync: vi.fn(), confirmBankSync: vi.fn(async () => ({ ok: true, message: "Fatto." })) }));

const preview: SyncPreview = {
  from: "2026-11-01",
  balance: null,
  items: [
    { ref: "n1", bookedOn: "2026-11-12", amountCents: -2000, description: "Supermercato", group: "new", reason: null, categoryId: null },
    { ref: "n2", bookedOn: "2026-11-02", amountCents: -1500, description: "SUPERMERCATO 02/11", group: "new", reason: null, categoryId: null },
    { ref: "r1", bookedOn: "2026-11-11", amountCents: -500, description: "Bar", group: "review", reason: "possible_duplicate", categoryId: null },
    { ref: "m1", bookedOn: "2026-11-10", amountCents: -5000, description: "Bolletta", group: "matched", reason: null, categoryId: null },
  ],
};
const categories = [{ id: "spesa", name: "Spesa", kind: "expense" as const }];
const wrap = () => render(<ToastProvider><BankSyncPreview bankAccountId="ba1" defaultFrom="2026-11-01" today="2026-11-20" categories={categories} /></ToastProvider>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(previewBankSync).mockResolvedValue({ ok: true, preview });
});

describe("BankSyncPreview", () => {
  it("loads the preview from the chosen day with new and doubtful movements selected", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Mostra anteprima" }));
    expect(previewBankSync).toHaveBeenCalledWith("ba1", "2026-11-01");
    expect(screen.getByRole("region", { name: "Nuovi" })).toHaveTextContent("Supermercato");
    expect(screen.getByRole("region", { name: "Già presenti" })).toHaveTextContent("Bolletta");
    expect(screen.getByLabelText(/Importa Supermercato/)).toBeChecked();
    expect(screen.getByLabelText(/Importa Bar/)).toBeChecked();
    expect(screen.queryByLabelText(/Importa Bolletta/)).toBeNull();
  });

  it("confirms only the movements left selected", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Mostra anteprima" }));
    await userEvent.click(screen.getByLabelText(/Importa Bar/));
    await userEvent.click(screen.getByRole("button", { name: "Conferma e importa (2)" }));
    expect(confirmBankSync).toHaveBeenCalledWith("ba1", "2026-11-01", ["n1", "n2"], []);
  });

  it("applies a picked category to identical new movements and sends the pick", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Mostra anteprima" }));
    await userEvent.selectOptions(screen.getByLabelText(/Categoria di Supermercato del/), "spesa");
    expect(screen.getByLabelText(/Categoria di SUPERMERCATO 02\/11/)).toHaveValue("spesa");
    await userEvent.click(screen.getByRole("button", { name: /Conferma e importa/ }));
    expect(confirmBankSync).toHaveBeenCalledWith("ba1", "2026-11-01", ["n1", "n2", "r1"], [["n1", "spesa"]]);
  });

  it("drops the preview when the day changes", async () => {
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Mostra anteprima" }));
    await userEvent.clear(screen.getByLabelText("Importa dal"));
    await userEvent.type(screen.getByLabelText("Importa dal"), "2026-11-05");
    expect(screen.queryByText("Supermercato")).toBeNull();
    expect(screen.getByRole("button", { name: "Mostra anteprima" })).toBeInTheDocument();
  });

  it("reports a failed preview", async () => {
    vi.mocked(previewBankSync).mockResolvedValueOnce({ ok: false, message: "La banca non ha risposto." });
    wrap();
    await userEvent.click(screen.getByRole("button", { name: "Mostra anteprima" }));
    expect(await screen.findByText("La banca non ha risposto.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Conferma/ })).toBeNull();
  });
});
