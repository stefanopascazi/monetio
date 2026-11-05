import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders a single h1 with eyebrow and actions", () => {
    render(<PageHeader eyebrow="Rossi household" title="Accounts" description="4 accounts" actions={<button>Add</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("Rossi household")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
