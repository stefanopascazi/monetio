import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPage } from "./LegalPage";

const doc = {
  title: "Titolo",
  intro: "Introduzione",
  updatedAt: "2026-11-19",
  sections: [
    { title: "Prima", paragraphs: ["Testo"], items: ["Voce A", "Voce B"] },
    { title: "Seconda", paragraphs: ["Altro"] },
  ],
};

describe("LegalPage", () => {
  it("renders title, date, sections and list items", () => {
    render(<LegalPage doc={doc} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Titolo");
    expect(screen.getByText("19 novembre 2026")).toHaveAttribute("datetime", "2026-11-19");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Prima", "Seconda"]);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("links both legal pages", () => {
    render(<LegalPage doc={doc} />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Termini del servizio" })).toHaveAttribute("href", "/terms-of-use");
  });
});
