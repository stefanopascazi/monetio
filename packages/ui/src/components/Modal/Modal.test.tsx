import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("renders content only while open", () => {
    const { rerender } = render(
      <Modal open={false} onOpenChange={() => {}} title="Settings">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByText("Body")).toBeNull();
    rerender(
      <Modal open onOpenChange={() => {}} title="Settings" description="Joint account">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("Joint account")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("closes from the close button, Esc and backdrop", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Settings">
        <p>Body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    fireEvent.click(dialog);
    fireEvent.click(screen.getByText("Body"));
    expect(onOpenChange).toHaveBeenCalledTimes(3);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
