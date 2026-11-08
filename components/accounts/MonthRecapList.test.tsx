import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthRecapList } from "./MonthRecapList";

const none = { outCents: 0, inCents: 0 };

describe("MonthRecapList", () => {
  it("shows both groups with their empty messages", () => {
    render(<MonthRecapList recap={{ paid: [], due: [], paidTotals: none, dueTotals: none }} />);
    expect(screen.getByText("Nessun movimento ancora previsto questo mese.")).toBeInTheDocument();
    expect(screen.getByText("Nessun movimento registrato questo mese.")).toBeInTheDocument();
  });

  it("splits due and paid items, with source and overdue badges", () => {
    render(
      <MonthRecapList
        recap={{
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
    const due = screen.getByRole("region", { name: "Da pagare" });
    const paid = screen.getByRole("region", { name: "Pagato" });
    expect(within(due).getAllByRole("listitem")).toHaveLength(2);
    expect(within(due).getByText("In ritardo")).toBeInTheDocument();
    expect(within(due).getByText("arretrato")).toBeInTheDocument();
    expect(within(due).getByText("stima")).toBeInTheDocument();
    expect(within(paid).getByText("Stipendio")).toBeInTheDocument();
  });
});
