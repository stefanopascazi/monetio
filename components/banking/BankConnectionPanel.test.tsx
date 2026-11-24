import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { removeBankConnection } from "@/app/actions/bank-links";
import type { BankConnection } from "@/lib/banking/connections";
import { BankConnectionPanel } from "./BankConnectionPanel";

vi.mock("@/app/actions/bank-links", () => ({
  removeBankConnection: vi.fn(async () => ({ ok: true, message: "Banca scollegata." })),
  linkBankAccount: vi.fn(),
}));

const now = new Date("2026-11-18T10:00:00Z");
const base: BankConnection = {
  id: "c1",
  bankName: "Mock ASPSP",
  validUntil: "2027-05-17T09:59:00Z",
  status: "active",
  createdAt: "2026-11-18T10:00:00Z",
  lastSyncedAt: null,
  accounts: [
    {
      id: "a1",
      name: "Conto corrente",
      ibanMasked: "IT60 •••• 3456",
      currency: "EUR",
      accountId: null,
      bankBalanceCents: null,
      bankBalanceOn: null,
      bankAvailableCents: null,
      lastSyncedAt: null,
      lastError: null,
      syncConfirmedAt: null,
      syncFrom: null,
      syncSlots: null,
    },
  ],
};
const options = [{ value: "acc-1", label: "Conto casa" }];
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankConnectionPanel", () => {
  it("lists the bank, its accounts and the consent end", () => {
    wrap(<BankConnectionPanel connection={base} accountOptions={options} now={now} />);
    expect(screen.getByText("Mock ASPSP")).toBeInTheDocument();
    expect(screen.getByText("Conto corrente")).toBeInTheDocument();
    expect(screen.getByText("IT60 •••• 3456")).toBeInTheDocument();
    expect(screen.getByText(/valido fino al 17 maggio 2027 \(180 giorni\)/)).toBeInTheDocument();
    expect(screen.getByText("Attivo")).toBeInTheDocument();
    expect(screen.getByLabelText("Conto MonetIO")).toHaveValue("");
  });

  it("flags consents about to expire or expired", () => {
    const { rerender } = wrap(<BankConnectionPanel connection={{ ...base, validUntil: "2026-11-25T10:00:00Z" }} accountOptions={options} now={now} />);
    expect(screen.getByText("In scadenza")).toBeInTheDocument();
    rerender(
      <ToastProvider>
        <BankConnectionPanel connection={{ ...base, status: "expired" }} accountOptions={options} now={now} />
      </ToastProvider>,
    );
    expect(screen.getByText("Scaduto")).toBeInTheDocument();
  });

  it("asks before unlinking", async () => {
    wrap(<BankConnectionPanel connection={base} accountOptions={options} now={now} />);
    await userEvent.click(screen.getByRole("button", { name: "Scollega" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Scollega" }).at(-1)!);
    expect(removeBankConnection).toHaveBeenCalledWith("c1");
  });

  it("sends a linked account to its Banca tab, without balances or history here", () => {
    const linked = { ...base, accounts: [{ ...base.accounts[0], accountId: "acc-1", bankBalanceCents: 1000, syncConfirmedAt: "2026-11-18T09:00:00Z" }] };
    wrap(<BankConnectionPanel connection={linked} accountOptions={options} now={now} />);
    expect(screen.getByRole("link", { name: "apri il conto" })).toHaveAttribute("href", "/conti/acc-1?sezione=banca");
    expect(screen.queryByText("Saldo contabile")).toBeNull();
    expect(screen.queryByRole("region", { name: "Ultimi aggiornamenti" })).toBeNull();
  });

  it("points a newly linked account to its first import on the account page", () => {
    const pending = { ...base, accounts: [{ ...base.accounts[0], accountId: "acc-1" }] };
    wrap(<BankConnectionPanel connection={pending} accountOptions={options} now={now} />);
    expect(screen.getByText(/Manca la conferma del primo import/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mostra anteprima" })).toBeNull();
  });

  it("says when the bank shared no account", () => {
    wrap(<BankConnectionPanel connection={{ ...base, accounts: [] }} accountOptions={options} now={now} />);
    expect(screen.getByText("La banca non ha condiviso nessun conto.")).toBeInTheDocument();
  });
});
