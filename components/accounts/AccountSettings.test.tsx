import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import type { AccountWithBalance } from "@/lib/data/queries";
import { AccountSettings } from "./AccountSettings";

vi.mock("@/app/actions/accounts", () => ({ updateAccount: vi.fn(), setAccountArchived: vi.fn() }));

const account = {
  id: "a1",
  name: "Conto cointestato",
  institution: "Intesa",
  type: "checking",
  visibility: "shared",
  openingBalanceCents: 0,
  openingDate: "2026-01-01",
  archived: false,
} as unknown as AccountWithBalance;

describe("AccountSettings", () => {
  it("opens the settings modal from the gear and closes it", async () => {
    render(
      <ToastProvider>
        <AccountSettings account={account} canMakePrivate />
      </ToastProvider>,
    );
    expect(screen.queryByLabelText("Nome")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Impostazioni del conto" }));
    expect(screen.getByRole("dialog", { name: "Impostazioni del conto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Conto cointestato");
    expect(screen.getByRole("button", { name: "Archivia conto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(screen.queryByLabelText("Nome")).toBeNull();
  });
});
