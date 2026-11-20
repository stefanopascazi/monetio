import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankPreviewList } from "./BankPreviewList";

describe("BankPreviewList", () => {
  it("explains an empty preview", () => {
    render(<BankPreviewList items={[]} selected={new Set()} onToggle={vi.fn()} />);
    expect(screen.getByText(/non ha movimenti da questa data/)).toBeInTheDocument();
  });

  it("shows why a movement needs a review and hides empty groups", () => {
    render(
      <BankPreviewList
        items={[{ ref: "r1", bookedOn: "2026-11-11", amountCents: -500, description: "Bar", group: "review", reason: "amount_differs", categoryId: null }]}
        selected={new Set(["r1"])}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Da rivedere" })).toHaveTextContent("Importo diverso dal previsto");
    expect(screen.queryByRole("region", { name: "Nuovi" })).toBeNull();
  });
});
