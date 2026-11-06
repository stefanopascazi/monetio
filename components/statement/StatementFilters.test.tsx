import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatementFilters } from "./StatementFilters";

describe("StatementFilters", () => {
  it("shows empty forms and no reset link for the latest rows", () => {
    render(<StatementFilters basePath="/conti/a1" period={{ kind: "recent", limit: 30 }} />);
    expect(screen.getByLabelText("Mese")).toHaveValue("");
    expect(screen.getByRole("form", { name: "Filtra per date" })).toHaveAttribute("action", "/conti/a1");
    expect(screen.queryByText("Mostra gli ultimi movimenti")).toBeNull();
  });

  it("prefills the active range and offers a reset", () => {
    render(<StatementFilters basePath="/conti/a1" period={{ kind: "range", from: "2026-01-10", to: "2026-01-20" }} />);
    expect(screen.getByLabelText("Da")).toHaveValue("2026-01-10");
    expect(screen.getByLabelText("A")).toHaveValue("2026-01-20");
    expect(screen.getByRole("link", { name: "Mostra gli ultimi movimenti" })).toHaveAttribute("href", "/conti/a1");
  });
});
