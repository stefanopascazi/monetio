import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("uses status role for info", () => {
    render(<Alert title="Synced">All accounts are up to date.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Synced");
  });

  it("uses alert role for danger and dismisses", async () => {
    const onDismiss = vi.fn();
    render(<Alert tone="danger" title="Over budget" onDismiss={onDismiss} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
