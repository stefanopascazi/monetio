import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("is labelled and accepts input", async () => {
    render(<TextField label="Payee" placeholder="e.g. Esselunga" />);
    const input = screen.getByLabelText("Payee");
    await userEvent.type(input, "Rent");
    expect(input).toHaveValue("Rent");
  });

  it("marks invalid and describes the error", () => {
    render(<TextField label="Payee" error="Required" id="payee" />);
    const input = screen.getByLabelText("Payee");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "payee-error");
  });

  it("renders prefix and suffix", () => {
    render(<TextField label="Rate" prefix="~" suffix="%" />);
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByText("~")).toBeInTheDocument();
  });
});
