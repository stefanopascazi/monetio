import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { undoBankSync } from "@/app/actions/bank-sync-batches";
import type { BankSyncBatch } from "@/lib/banking/sync-batches";
import { BankSyncHistory } from "./BankSyncHistory";

vi.mock("@/app/actions/bank-sync-batches", () => ({
  undoBankSync: vi.fn(async () => ({ ok: true, message: "Aggiornamento annullato." })),
  loadBankSyncBatchDetail: vi.fn(async () => ({
    ok: true,
    detail: { inserted: [{ id: "t1", bookedOn: "2026-11-15", amountCents: -700, description: "Spesa" }], reconciled: [], reviews: [] },
  })),
}));

const batches: BankSyncBatch[] = [
  { id: "new", accountId: "acc", kind: "worker", inserted: 2, reconciled: 1, review: 0, createdAt: "2026-11-20T07:00:00Z", undoneAt: null },
  { id: "old", accountId: "acc", kind: "preview", inserted: 5, reconciled: 0, review: 1, createdAt: "2026-11-18T07:00:00Z", undoneAt: null },
];
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankSyncHistory", () => {
  it("renders nothing without batches", () => {
    const { container } = wrap(<BankSyncHistory batches={[]} />);
    expect(container.querySelector(".mio-accordion")).toBeNull();
  });

  it("lists batches and offers undo only on the newest active one", async () => {
    const user = userEvent.setup();
    wrap(<BankSyncHistory batches={batches} />);
    await user.click(screen.getByRole("button", { name: /Ultimi aggiornamenti/ }));
    expect(screen.getByText("Aggiornamento automatico")).toBeInTheDocument();
    expect(screen.getByText("Primo import")).toBeInTheDocument();
    expect(screen.getByText("2 nuovi · 1 abbinato")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Annulla aggiornamento/ })).toHaveLength(1);
  });

  it("undoes the batch after confirmation", async () => {
    const user = userEvent.setup();
    wrap(<BankSyncHistory batches={batches} />);
    await user.click(screen.getByRole("button", { name: /Ultimi aggiornamenti/ }));
    await user.click(screen.getByRole("button", { name: /Annulla aggiornamento/ }));
    expect(screen.getByText(/rileggerà questi giorni/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sì, annulla" }));
    expect(undoBankSync).toHaveBeenCalledWith("new");
    expect(await screen.findByText("Aggiornamento annullato.")).toBeInTheDocument();
  });

  it("marks undone batches and moves undo to the previous one", async () => {
    const user = userEvent.setup();
    wrap(<BankSyncHistory batches={[{ ...batches[0], undoneAt: "2026-11-20T08:00:00Z" }, batches[1]]} />);
    await user.click(screen.getByRole("button", { name: /Ultimi aggiornamenti/ }));
    expect(screen.getByText("Annullato")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Annulla aggiornamento/ }));
    expect(screen.getByText(/anteprima del primo import/)).toBeInTheDocument();
  });

  it("shows the movements of an active batch on demand", async () => {
    const user = userEvent.setup();
    wrap(<BankSyncHistory batches={[{ ...batches[0], undoneAt: "2026-11-20T08:00:00Z" }, batches[1]]} />);
    await user.click(screen.getByRole("button", { name: /Ultimi aggiornamenti/ }));
    expect(screen.getAllByRole("button", { name: "Vedi movimenti" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Vedi movimenti" }));
    expect(await screen.findByText("Spesa")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nascondi movimenti" }));
    expect(screen.queryByText("Spesa")).toBeNull();
  });
});
