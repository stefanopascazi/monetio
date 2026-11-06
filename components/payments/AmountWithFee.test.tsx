import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmountWithFee } from "./AmountWithFee";

describe("AmountWithFee", () => {
  it("shows the total and the split below", () => {
    const { container } = render(<AmountWithFee cents={-4633} feeCents={100} />);
    expect(container.textContent).toMatch(/47,33/);
    expect(screen.getByText(/46,33\s€ \+ 1,00\s€ spese/)).toBeInTheDocument();
  });

  it("shows only the amount without a fee", () => {
    const { container } = render(<AmountWithFee cents={-500} />);
    expect(container.textContent).not.toMatch(/spese/);
  });
});
