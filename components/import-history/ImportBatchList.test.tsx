import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { ImportBatchList } from "./ImportBatchList";

const undoImport = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "Import annullato: 2 movimenti eliminati." })));
vi.mock("@/app/actions/import", () => ({ undoImport }));

const base = { fileName: "cherry.xlsx", bank: "Cherry Bank", accountName: "Conto cointestato", importedOn: "11 nov 2026", period: "dal 15 ott 2026 al 11 nov 2026", rowCount: 2, totalCents: -1500, undoneOn: null };

describe("ImportBatchList", () => {
  it("undoes an import after confirmation", async () => {
    render(
      <ToastProvider>
        <ImportBatchList items={[{ ...base, id: "b1", undone: false }]} />
      </ToastProvider>,
    );
    expect(screen.getByText("Conto cointestato · importato il 11 nov 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Annulla import" }));
    expect(screen.getByText(/Eliminare i 2 movimenti/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Annulla import" }));
    await waitFor(() => expect(undoImport).toHaveBeenCalledWith("b1"));
    expect(await screen.findByText("Import annullato: 2 movimenti eliminati.")).toBeInTheDocument();
  });

  it("shows undone imports without the undo button", () => {
    render(
      <ToastProvider>
        <ImportBatchList items={[{ ...base, id: "b2", undone: true, undoneOn: "12 nov 2026" }]} />
      </ToastProvider>,
    );
    expect(screen.getByText("Annullato il 12 nov 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annulla import" })).not.toBeInTheDocument();
  });
});
