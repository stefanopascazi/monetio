import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReliabilityNote } from "./ReliabilityNote";

const tip = { kind: "stale" as const, accountId: "a", message: "Aggiorna Carta", href: "/dati/importa", gain: 10 };
const accounts = [{ accountId: "a", name: "Carta", score: 40, level: "low" as const }];

describe("ReliabilityNote", () => {
  it("opens the suggestions inline below high reliability", async () => {
    render(<ReliabilityNote data={{ score: 60, level: "medium", accounts, suggestions: [tip] }} seriesId="all" />);
    const toggle = screen.getByRole("button", { name: /Affidabilità media · 60\/100/ });
    expect(screen.queryByRole("link")).toBeNull();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Aggiorna Carta" })).toHaveAttribute("href", "/dati/importa");
  });

  it("is a plain label when reliability is high", () => {
    render(<ReliabilityNote data={{ score: 90, level: "high", accounts: [], suggestions: [tip] }} seriesId="all" />);
    expect(screen.getByText("Affidabilità alta")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("follows the selected account", () => {
    render(<ReliabilityNote data={{ score: 90, level: "high", accounts, suggestions: [tip] }} seriesId="a" />);
    expect(screen.getByRole("button", { name: /Affidabilità bassa · 40\/100/ })).toBeInTheDocument();
  });
});
