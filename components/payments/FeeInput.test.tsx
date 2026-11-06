import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeeInput } from "./FeeInput";

describe("FeeInput", () => {
  it("posts the fee cents and shows the hint", () => {
    const { container } = render(<FeeInput valueCents={65} onValueChange={() => {}} hint="Diventa un movimento separato" />);
    expect(container.querySelector<HTMLInputElement>('input[name="feeCents"]')?.value).toBe("65");
    expect(screen.getByText("Diventa un movimento separato")).toBeInTheDocument();
    expect(screen.getByLabelText(/Spese/)).toBeInTheDocument();
  });
});
