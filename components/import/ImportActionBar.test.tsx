import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImportActionBar } from "./ImportActionBar";

const summary = { count: 3, totalCents: -1500, from: "2025-01-01", to: "2025-01-03", duplicates: 0, possible: 0, beforeOpening: 0 };

describe("ImportActionBar", () => {
  it("confirms the selected rows", async () => {
    const onConfirm = vi.fn();
    render(<ImportActionBar summary={summary} checking={false} importing={false} onConfirm={onConfirm} />);
    expect(screen.getByText("3 da importare")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Importa 3 movimenti" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is disabled while checking or with nothing selected", () => {
    const { rerender } = render(<ImportActionBar summary={null} checking importing={false} onConfirm={vi.fn()} />);
    expect(screen.getByText("Controllo in corso…")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
    rerender(<ImportActionBar summary={{ ...summary, count: 0 }} checking={false} importing={false} onConfirm={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Importa 0 movimenti" })).toBeDisabled();
  });
});
