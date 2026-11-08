import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecapMonthNav } from "./RecapMonthNav";

describe("RecapMonthNav", () => {
  it("hides the reset link on the current month", () => {
    render(<RecapMonthNav label="novembre 2026" prevHref={null} nextHref="/conti/a?proiezione=2026-12" resetHref={null} />);
    expect(screen.queryByRole("link", { name: "Mese corrente" })).not.toBeInTheDocument();
  });

  it("links back to the current month while on a projected one", () => {
    render(<RecapMonthNav label="dicembre 2026" prevHref="/conti/a" nextHref={null} resetHref="/conti/a" />);
    expect(screen.getByRole("link", { name: "Mese corrente" })).toHaveAttribute("href", "/conti/a");
  });
});
