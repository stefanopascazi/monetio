import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecapItemSummary } from "./RecapItemSummary";

const item = { key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: 0, overdue: false };

describe("RecapItemSummary", () => {
  it("shows label and source badge", () => {
    render(<RecapItemSummary item={item} />);
    expect(screen.getByText("Psicologa")).toBeInTheDocument();
    expect(screen.getByText("stima")).toBeInTheDocument();
    expect(screen.queryByText("esaurita")).not.toBeInTheDocument();
  });

  it("flags a used-up estimate and an overdue item", () => {
    render(<RecapItemSummary item={{ ...item, overdue: true, usage: { totalCents: 6500, usedCents: 6500, overCents: 0, parts: [] } }} />);
    expect(screen.getByText("esaurita")).toBeInTheDocument();
    expect(screen.getByText("In ritardo")).toBeInTheDocument();
    expect(screen.getByText("arretrato")).toBeInTheDocument();
  });

  it("flags an exceeded estimate", () => {
    render(<RecapItemSummary item={{ ...item, usage: { totalCents: 6500, usedCents: 6500, overCents: 1500, parts: [] } }} />);
    expect(screen.getByText("superata")).toBeInTheDocument();
    expect(screen.queryByText("esaurita")).not.toBeInTheDocument();
  });
});
