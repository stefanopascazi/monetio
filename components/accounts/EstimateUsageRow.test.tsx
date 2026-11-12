import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EstimateUsageRow } from "./EstimateUsageRow";

const usage = { totalCents: 6500, usedCents: 1700, overCents: 0, parts: [{ id: "t", description: "Farmacia", bookedOn: "2026-11-03", amountCents: -1700, movementCents: -1700 }] };
const item = { key: "1", date: "2026-11-15", label: "Psicologa", source: "estimate" as const, amountCents: -4800, overdue: false, usage };

describe("EstimateUsageRow", () => {
  it("opens on the movements behind the estimate", () => {
    render(<EstimateUsageRow item={item} />);
    const trigger = screen.getByRole("button", { name: /Psicologa/ });
    expect(screen.queryByText("Farmacia")).not.toBeVisible();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Farmacia")).toBeVisible();
  });
});
