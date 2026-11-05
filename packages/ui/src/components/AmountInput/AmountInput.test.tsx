import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { AmountInput } from "./AmountInput";

function Harness({ onChange }: { onChange: (v: number | null) => void }) {
  const [v, setV] = useState<number | null>(null);
  return (
    <AmountInput
      label="Amount"
      kind="expense"
      valueCents={v}
      onValueChange={(c) => {
        setV(c);
        onChange(c);
      }}
    />
  );
}

describe("AmountInput", () => {
  it("parses typed input into cents", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Amount"), "82.4");
    expect(onChange).toHaveBeenLastCalledWith(8240);
  });

  it("formats on blur", async () => {
    render(<Harness onChange={() => {}} />);
    const input = screen.getByLabelText("Amount");
    await userEvent.type(input, "1234.5");
    await userEvent.tab();
    expect(input).toHaveValue("1,234.50");
  });

  it("follows external value changes when not editing", () => {
    const { rerender } = render(<AmountInput label="Amount" valueCents={100} onValueChange={() => {}} />);
    rerender(<AmountInput label="Amount" valueCents={250050} onValueChange={() => {}} />);
    expect(screen.getByLabelText("Amount")).toHaveValue("2,500.50");
  });

  it("shows the sign for the kind and the currency symbol", () => {
    render(<AmountInput label="Amount" kind="income" valueCents={1000} onValueChange={() => {}} />);
    expect(screen.getByText("+")).toBeInTheDocument();
    expect(screen.getByText("€")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toHaveValue("10.00");
  });
});
