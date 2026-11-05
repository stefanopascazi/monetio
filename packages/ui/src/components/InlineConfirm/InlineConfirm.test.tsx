import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InlineConfirm } from "./InlineConfirm";

describe("InlineConfirm", () => {
  it("asks before confirming and focuses cancel", async () => {
    const onConfirm = vi.fn();
    render(<InlineConfirm triggerLabel="Delete" message="Delete this transaction?" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this transaction?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("cancels without confirming", async () => {
    const onConfirm = vi.fn();
    render(<InlineConfirm triggerLabel="Archive" message="Archive?" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
