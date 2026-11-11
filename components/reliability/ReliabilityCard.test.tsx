import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReliabilitySuggestion } from "@/lib/domain/reliability";
import { ReliabilityCard } from "./ReliabilityCard";

const tip = (i: number): ReliabilitySuggestion => ({ kind: "stale", accountId: `a${i}`, message: `Aggiorna conto ${i}`, href: "/dati/importa", gain: 10 });
const accounts = [
  { accountId: "a1", name: "Cointestato", score: 90, level: "high" as const },
  { accountId: "a2", name: "Carta", score: 40, level: "low" as const },
];

describe("ReliabilityCard", () => {
  it("shows level, score and the first suggestions as links to the fix", () => {
    render(<ReliabilityCard reliability={{ score: 65, level: "medium", accounts, suggestions: [tip(1), tip(2), tip(3), tip(4)] }} maxSuggestions={2} />);
    expect(screen.getByText("Media · 65/100")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aggiorna conto 1" })).toHaveAttribute("href", "/dati/importa");
    expect(screen.queryByText("Aggiorna conto 3")).toBeNull();
    expect(screen.getByRole("link", { name: "Vedi gli altri 2 suggerimenti" })).toHaveAttribute("href", "/proiezioni");
    expect(screen.queryByLabelText("Affidabilità per conto")).toBeNull();
  });

  it("lists account levels on request and says when nothing is left to do", () => {
    const { rerender } = render(<ReliabilityCard reliability={{ score: 90, level: "high", accounts, suggestions: [tip(1), tip(2), tip(3), tip(4)] }} showAccounts />);
    expect(screen.getAllByRole("link")).toHaveLength(4);
    rerender(<ReliabilityCard reliability={{ score: 90, level: "high", accounts, suggestions: [] }} showAccounts />);
    expect(screen.getByText("Carta: Bassa")).toBeInTheDocument();
    expect(screen.getByText("Nessuna azione da fare.")).toBeInTheDocument();
  });
});
