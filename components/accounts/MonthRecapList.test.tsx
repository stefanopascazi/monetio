import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { MonthRecapList } from "./MonthRecapList";

vi.mock("@/app/actions/estimates", () => ({ bookEstimate: vi.fn(), closeEstimate: vi.fn() }));
vi.mock("@/app/actions/overrides", () => ({ setOccurrenceAmount: vi.fn(), clearOccurrenceAmount: vi.fn() }));
vi.mock("@/app/actions/rules", () => ({ markEntryPaid: vi.fn() }));
vi.mock("@/app/actions/transactions", () => ({ confirmPlanned: vi.fn(), deleteTransaction: vi.fn(), updateTransaction: vi.fn() }));

const none = { outCents: 0, inCents: 0 };
const empty = { month: "2026-11", openingCents: 1000, closingCents: 1000, due: [], dueTotals: none };

describe("MonthRecapList", () => {
  it("shows the current balance and the items to book with their empty message, never a booked card", () => {
    render(<MonthRecapList recap={empty} current />);
    expect(screen.getByText("Saldo attuale")).toBeInTheDocument();
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
    expect(screen.getByText("Nessun movimento da contabilizzare: novembre 2026.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Contabilizzato" })).not.toBeInTheDocument();
  });

  it("starts a future month from the previous month's rimanenza", () => {
    render(<MonthRecapList recap={{ ...empty, month: "2026-12" }} current={false} nav={<nav>Mesi</nav>} />);
    expect(screen.getByText("Rimanenza di novembre 2026")).toBeInTheDocument();
    expect(screen.getByText("Mesi")).toBeInTheDocument();
  });

  it("lists items to book with source, planned and overdue marks", () => {
    render(
      <MonthRecapList
        current
        recap={{
          ...empty,
          due: [
            { key: "1", date: "2026-11-08", label: "Affitto", source: "rule", amountCents: -80000, overdue: true },
            { key: "2", date: "2026-11-20", label: "Spesa", source: "estimate", amountCents: -15000, overdue: false },
            { key: "3", date: "2026-11-25", label: "Dentista", source: "planned", amountCents: -9000, overdue: false },
          ],
          dueTotals: { outCents: 104000, inCents: 0 },
        }}
      />,
    );
    const due = screen.getByRole("region", { name: "Da contabilizzare" });
    expect(within(due).getAllByRole("listitem")).toHaveLength(3);
    expect(within(due).getByText("In ritardo")).toBeInTheDocument();
    expect(within(due).getByText("arretrato")).toBeInTheDocument();
    expect(within(due).getByText("stima")).toBeInTheDocument();
    expect(within(due).getByLabelText("Pianificato")).toBeInTheDocument();
    expect(within(due).queryByText("pianificato")).not.toBeInTheDocument();
    expect(within(due).getByText("3 movimenti · novembre 2026")).toBeInTheDocument();
  });

  it("offers to book or drop estimates only in the current month, from the opened row", () => {
    const due = [{ key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: -4800, overdue: false, ref: "r:p|2026-11" }];
    const { rerender } = render(
      <ToastProvider>
        <MonthRecapList current today="2026-11-08" recap={{ ...empty, due, dueTotals: { outCents: 4800, inCents: 0 } }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Psicologa/ }));
    expect(screen.getByRole("button", { name: "Registra movimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elimina stima" })).toBeInTheDocument();
    rerender(
      <ToastProvider>
        <MonthRecapList current={false} today="2026-11-08" recap={{ ...empty, month: "2026-12", due, dueTotals: { outCents: 4800, inCents: 0 } }} />
      </ToastProvider>,
    );
    expect(screen.queryByRole("button", { name: "Registra movimento" })).not.toBeInTheDocument();
  });

  it("shows a used-up decreasing estimate with what consumed it and no actions", () => {
    const usage = { totalCents: 6500, usedCents: 6500, overCents: 0, parts: [{ id: "t", description: "Visita", bookedOn: "2026-11-03", amountCents: -8000, movementCents: -8000 }] };
    const due = [{ key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: 0, overdue: false, ref: "r:p|2026-11", usage }];
    render(
      <ToastProvider>
        <MonthRecapList current today="2026-11-08" recap={{ ...empty, due }} />
      </ToastProvider>,
    );
    expect(screen.getByText("esaurita")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Psicologa/ }));
    expect(screen.getByText("Visita")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registra movimento" })).not.toBeInTheDocument();
  });
});
