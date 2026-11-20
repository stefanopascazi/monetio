import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { loadBankSyncBatchDetail } from "@/app/actions/bank-sync-batches";
import { BankSyncBatchDetails } from "./BankSyncBatchDetails";

vi.mock("@/app/actions/bank-sync-batches", () => ({ loadBankSyncBatchDetail: vi.fn() }));
const load = vi.mocked(loadBankSyncBatchDetail);

const mv = (id: string, amountCents: number) => ({ id, bookedOn: "2026-11-15", amountCents, description: `Mov ${id}` });

describe("BankSyncBatchDetails", () => {
  it("groups new, matched and queued movements with the values undo restores", async () => {
    load.mockResolvedValue({
      ok: true,
      detail: {
        inserted: [mv("a", -700)],
        reconciled: [
          { ...mv("b", -5000), status: "booked", prevStatus: "planned", prevBookedOn: "2026-11-10", prevAmountCents: -5000 },
          { ...mv("c", -100), status: "booked", prevStatus: "booked", prevBookedOn: "2026-11-15", prevAmountCents: -100 },
        ],
        reviews: [{ ...mv("d", -800), state: "excluded" }],
      },
    });
    render(<BankSyncBatchDetails batchId="b1" />);
    expect(await screen.findByText("Mov a")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("b1");
    expect(screen.getByRole("region", { name: "Nuovi" })).toBeInTheDocument();
    expect(screen.getByText(/Prima: previsto · 10 nov 2026/)).toBeInTheDocument();
    expect(screen.getByText("Aggiunto solo il riferimento della banca")).toBeInTheDocument();
    expect(screen.getByText("Escluso")).toBeInTheDocument();
  });

  it("says when the batch has no movements left", async () => {
    load.mockResolvedValue({ ok: true, detail: { inserted: [], reconciled: [], reviews: [] } });
    render(<BankSyncBatchDetails batchId="b1" />);
    expect(await screen.findByText("Nessun movimento.")).toBeInTheDocument();
  });

  it("shows load errors", async () => {
    load.mockResolvedValue({ ok: false, message: "Operazione non riuscita. Riprova." });
    render(<BankSyncBatchDetails batchId="b1" />);
    expect(await screen.findByText("Operazione non riuscita. Riprova.")).toBeInTheDocument();
  });
});
