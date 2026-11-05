import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AccountCard } from "./AccountCard";

describe("AccountCard", () => {
  it("shows a private account", () => {
    render(<AccountCard name="Personal" type="checking" institution="Fineco" balanceCents={152000} members={["Giulia"]} />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("Checking · Fineco")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByLabelText("€1,520.00")).toBeInTheDocument();
  });

  it("shows members for a shared account and the change", () => {
    render(<AccountCard name="ETF" type="investment" balanceCents={1} members={["Giulia", "Marco"]} change={3.4} />);
    expect(screen.getByRole("group", { name: "Shared with Giulia, Marco" })).toBeInTheDocument();
    expect(screen.getByText("+3.4%")).toHaveClass("is-up");
  });
});
