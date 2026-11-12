import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { MonthRecapList } from "./MonthRecapList";

vi.mock("@/app/actions/estimates", () => ({ bookEstimate: vi.fn(), closeEstimate: vi.fn() }));

const none = { outCents: 0, inCents: 0 };
const empty = { month: "2026-11", openingCents: 1000, closingCents: 1000, paid: [], due: [], paidTotals: none, dueTotals: none };

describe("MonthRecapList", () => {
  it("shows the current balance and both groups with their empty messages", () => {
    render(<MonthRecapList recap={empty} current />);
    expect(screen.getByText("Saldo attuale")).toBeInTheDocument();
    expect(screen.getByText("Rimanenza a fine mese")).toBeInTheDocument();
    expect(screen.getByText("Nessun movimento da contabilizzare: novembre 2026.")).toBeInTheDocument();
    expect(screen.getByText("Nessun movimento contabilizzato: novembre 2026.")).toBeInTheDocument();
  });

  it("starts a future month from the previous month's rimanenza and hides an empty booked card", () => {
    render(<MonthRecapList recap={{ ...empty, month: "2026-12" }} current={false} nav={<nav>Mesi</nav>} />);
    expect(screen.getByText("Rimanenza di novembre 2026")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Contabilizzato" })).not.toBeInTheDocument();
    expect(screen.getByText("Mesi")).toBeInTheDocument();
  });

  it("splits items to book and booked ones into separate cards, with source and overdue badges", () => {
    render(
      <MonthRecapList
        current
        recap={{
          ...empty,
          due: [
            { key: "1", date: "2026-11-08", label: "Affitto", source: "rule", amountCents: -80000, overdue: true },
            { key: "2", date: "2026-11-20", label: "Spesa", source: "estimate", amountCents: -15000, overdue: false },
          ],
          paid: [{ key: "3", date: "2026-11-02", label: "Stipendio", source: "booked", amountCents: 200000, overdue: false }],
          dueTotals: { outCents: 95000, inCents: 0 },
          paidTotals: { outCents: 0, inCents: 200000 },
        }}
      />,
    );
    const due = screen.getByRole("region", { name: "Da contabilizzare" });
    const paid = screen.getByRole("region", { name: "Contabilizzato" });
    expect(within(due).getAllByRole("listitem")).toHaveLength(2);
    expect(within(due).getByText("In ritardo")).toBeInTheDocument();
    expect(within(due).getByText("arretrato")).toBeInTheDocument();
    expect(within(due).getByText("stima")).toBeInTheDocument();
    expect(within(paid).getByText("Stipendio")).toBeInTheDocument();
    expect(within(due).getByText("2 movimenti · novembre 2026")).toBeInTheDocument();
    expect(within(paid).getByText("1 movimento · novembre 2026")).toBeInTheDocument();
  });

  it("offers to book or drop estimates only in the current month", () => {
    const due = [
      { key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: -4800, overdue: false, ref: "r:p|2026-11" },
      { key: "2", date: "2026-11-20", label: "Luce", source: "rule" as const, amountCents: -5000, overdue: false },
    ];
    const { rerender } = render(
      <ToastProvider>
        <MonthRecapList current today="2026-11-08" recap={{ ...empty, due, dueTotals: { outCents: 9800, inCents: 0 } }} />
      </ToastProvider>,
    );
    expect(screen.getAllByRole("button", { name: "Registra movimento" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Elimina stima" })).toBeInTheDocument();
    rerender(
      <ToastProvider>
        <MonthRecapList current={false} today="2026-11-08" recap={{ ...empty, month: "2026-12", due, dueTotals: { outCents: 9800, inCents: 0 } }} />
      </ToastProvider>,
    );
    expect(screen.queryByRole("button", { name: "Registra movimento" })).not.toBeInTheDocument();
  });

  it("shows decreasing estimates as accordions and hides actions once used up", () => {
    const usage = { totalCents: 6500, usedCents: 6500, parts: [{ id: "t", description: "Visita", bookedOn: "2026-11-03", amountCents: -8000 }] };
    const due = [
      { key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: 0, overdue: false, ref: "r:p|2026-11", usage },
      { key: "2", date: "2026-11-20", label: "Spesa", source: "estimate" as const, amountCents: -4800, overdue: false, ref: "r:s|2026-11", usage: { ...usage, usedCents: 1700 } },
    ];
    render(
      <ToastProvider>
        <MonthRecapList current today="2026-11-08" recap={{ ...empty, due, dueTotals: { outCents: 4800, inCents: 0 } }} />
      </ToastProvider>,
    );
    expect(screen.getByRole("button", { name: /Psicologa/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("esaurita")).toBeInTheDocument();
    // Only the estimate with something left can still be booked.
    expect(screen.getAllByRole("button", { name: "Registra movimento" })).toHaveLength(1);
  });
});
