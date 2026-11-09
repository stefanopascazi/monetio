import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { setAccountArchived } from "@/app/actions/accounts";
import { ArchivedAccounts } from "./ArchivedAccounts";

vi.mock("@/app/actions/accounts", () => ({
  setAccountArchived: vi.fn(async () => ({ ok: true, message: "ok" })),
}));

const old = { id: "x1", name: "Vecchio conto", institution: "Banca", balanceCents: 0 };

const renderList = (accounts: (typeof old)[]) =>
  render(
    <ToastProvider>
      <ArchivedAccounts accounts={accounts} />
    </ToastProvider>,
  );

describe("ArchivedAccounts", () => {
  it("renders nothing without archived accounts", () => {
    renderList([]);
    expect(screen.queryByText(/Conti archiviati/)).toBeNull();
  });

  it("links the statement and restores the account", async () => {
    renderList([old]);
    expect(screen.getByRole("heading", { name: "Conti archiviati (1)" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Espandi" }));
    expect(screen.getByRole("link", { name: /Vecchio conto/ })).toHaveAttribute("href", "/conti/x1");
    await userEvent.click(screen.getByRole("button", { name: "Ripristina" }));
    expect(setAccountArchived).toHaveBeenCalledWith("x1", false);
  });
});
