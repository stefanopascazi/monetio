import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar, budgetSeverity } from "./ProgressBar";

describe("budgetSeverity", () => {
  it("maps ratio to severity", () => {
    expect(budgetSeverity(0.5)).toBe("ok");
    expect(budgetSeverity(0.8)).toBe("warning");
    expect(budgetSeverity(1.2)).toBe("danger");
  });
});

describe("ProgressBar", () => {
  it("shows remaining budget", () => {
    render(<ProgressBar label="Groceries" valueCents={32000} maxCents={40000} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "80");
    expect(screen.getByText("80% · €80 left")).toBeInTheDocument();
  });

  it("shows overspend capped at 100% width", () => {
    const { container } = render(<ProgressBar label="Dining" valueCents={15000} maxCents={10000} />);
    expect(screen.getByText("150% · €50 over")).toBeInTheDocument();
    expect((container.querySelector(".mio-progress__fill") as HTMLElement).style.width).toBe("100%");
  });

  it("supports goal mode", () => {
    render(<ProgressBar label="Holiday" valueCents={200000} maxCents={200000} mode="goal" />);
    expect(screen.getByText("100% · Goal reached")).toBeInTheDocument();
  });
});
