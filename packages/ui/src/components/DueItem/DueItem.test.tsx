import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DueItem, dueStatus } from "./DueItem";

const today = new Date(2026, 10, 5);

describe("dueStatus", () => {
  it("classifies by days left", () => {
    expect(dueStatus(-1)).toBe("overdue");
    expect(dueStatus(0)).toBe("soon");
    expect(dueStatus(3)).toBe("soon");
    expect(dueStatus(4)).toBe("upcoming");
    expect(dueStatus(-5, true)).toBe("paid");
  });
});

describe("DueItem amountNote", () => {
  it("shows the note under the amount", () => {
    render(<DueItem title="Tasse" dueDate={new Date(2026, 10, 7)} amountCents={4733} amountNote="46,33 € + 1,00 € spese" today={today} />);
    expect(screen.getByText("46,33 € + 1,00 € spese").closest(".mio-due__amount")).not.toBeNull();
  });
});

describe("DueItem", () => {
  it("renders leaf date, frequency and due-soon badge", () => {
    render(<DueItem title="Rent" dueDate={new Date(2026, 10, 7)} amountCents={95000} account="Joint" today={today} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Monthly · Joint")).toBeInTheDocument();
    expect(screen.getByText("In 2 days")).toBeInTheDocument();
    expect(screen.getByLabelText("−€950.00")).toBeInTheDocument();
  });

  it("shows overdue and handles mark as paid", async () => {
    const onPaid = vi.fn();
    render(<DueItem title="Electricity" dueDate={new Date(2026, 10, 2)} amountCents={8000} today={today} onMarkPaid={onPaid} />);
    expect(screen.getByText("3 days overdue")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark as paid" }));
    expect(onPaid).toHaveBeenCalled();
  });

  it("hides actions when paid", () => {
    render(<DueItem title="Gym" dueDate={new Date(2026, 10, 1)} amountCents={4000} today={today} paid onMarkPaid={() => {}} />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
