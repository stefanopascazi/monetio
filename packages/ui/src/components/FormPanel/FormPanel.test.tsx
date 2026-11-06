import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormPanel } from "./FormPanel";

describe("FormPanel", () => {
  it("starts collapsed and expands on header click", async () => {
    render(
      <FormPanel title="Add transaction">
        <input aria-label="Payee" />
      </FormPanel>,
    );
    const header = screen.getByRole("button", { name: /Add transaction/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Payee")).not.toBeVisible();
    await userEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Payee")).toBeVisible();
  });

  it("is always open when not collapsible", () => {
    render(
      <FormPanel title="New account" collapsible={false}>
        <input aria-label="Name" />
      </FormPanel>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByLabelText("Name")).toBeVisible();
  });

  it("renders only the form in plain mode", () => {
    render(
      <FormPanel title="Hidden title" plain>
        <input aria-label="Name" />
      </FormPanel>,
    );
    expect(screen.queryByText("Hidden title")).toBeNull();
    expect(screen.getByLabelText("Name")).toBeVisible();
  });

  it("calls onSubmit without page reload", () => {
    const onSubmit = vi.fn();
    render(
      <FormPanel title="Add" defaultOpen onSubmit={onSubmit} actions={<button type="submit">Save</button>}>
        <input aria-label="x" />
      </FormPanel>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
