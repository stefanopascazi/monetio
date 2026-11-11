import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryComparisonList } from "./CategoryComparisonList";
import { FixedVariableCard } from "./FixedVariableCard";
import { TopMerchantsList } from "./TopMerchantsList";

describe("CategoryComparisonList", () => {
  it("flags notable changes, steady categories and new ones", () => {
    render(
      <CategoryComparisonList
        monthLabel="ottobre 2026"
        baseMonths={6}
        rows={[
          { categoryId: "a", name: "Spesa", currentCents: 30000, averageCents: 20000, deltaPct: 50 },
          { categoryId: "b", name: "Bar", currentCents: 1000, averageCents: 1050, deltaPct: -5 },
          { categoryId: "c", name: "Viaggi", currentCents: 0, averageCents: 4000, deltaPct: -100 },
          { categoryId: null, name: "Senza categoria", currentCents: 500, averageCents: 0, deltaPct: null },
        ]}
      />,
    );
    expect(screen.getByText("ottobre 2026 rispetto alla media dei 6 mesi precedenti")).toBeInTheDocument();
    expect(screen.getByText("+50%")).toBeInTheDocument();
    expect(screen.getByText("In linea")).toBeInTheDocument();
    expect(screen.getByText("-100%")).toBeInTheDocument();
    expect(screen.getByText("Nuova")).toBeInTheDocument();
  });

  it("explains an empty period", () => {
    render(<CategoryComparisonList monthLabel="ottobre 2026" baseMonths={3} rows={[]} />);
    expect(screen.getByText("Nessuna spesa registrata nel periodo.")).toBeInTheDocument();
  });
});

describe("TopMerchantsList", () => {
  it("ranks merchants with their payment count", () => {
    render(
      <TopMerchantsList
        merchants={[
          { label: "Conad", totalCents: 7000, count: 2 },
          { label: "Netflix", totalCents: 1299, count: 1 },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Conad");
    expect(items[0]).toHaveTextContent("2 pagamenti");
    expect(items[1]).toHaveTextContent("1 pagamento");
  });
});

describe("FixedVariableCard", () => {
  it("shows the split as percentages", () => {
    render(<FixedVariableCard fixedCents={75000} variableCents={25000} />);
    expect(screen.getByRole("img", { name: "Spese fisse 75%, variabili 25%" })).toBeInTheDocument();
    expect(screen.getByText("Fisse · 75%")).toBeInTheDocument();
  });

  it("explains an empty period", () => {
    render(<FixedVariableCard fixedCents={0} variableCents={0} />);
    expect(screen.getByText("Nessuna spesa registrata nel periodo.")).toBeInTheDocument();
  });
});
