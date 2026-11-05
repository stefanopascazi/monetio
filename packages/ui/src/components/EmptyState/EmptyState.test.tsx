import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title, description and action", () => {
    render(<EmptyState title="No recurring payments" description="Add rent or bills." action={<button>Add payment</button>} />);
    expect(screen.getByText("No recurring payments")).toBeInTheDocument();
    expect(screen.getByText("Add rent or bills.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add payment" })).toBeInTheDocument();
  });
});
