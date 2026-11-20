import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { removeBankConnection } from "@/app/actions/bank-links";
import type { BankConnection } from "@/lib/banking/connections";
import { BankConnectionPanel } from "./BankConnectionPanel";

vi.mock("@/app/actions/bank-sync", () => ({ previewBankSync: vi.fn(), confirmBankSync: vi.fn() }));
vi.mock("@/app/actions/bank-sync-batches", () => ({ undoBankSync: vi.fn(), loadBankSyncBatchDetail: vi.fn() }));
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
      lastSyncedAt: null,
      lastError: null,
      syncConfirmedAt: null,
      syncFrom: null,
    },
  ],
};
const options = [{ value: "acc-1", label: "Conto casa" }];
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankConnectionPanel", () => {
  it("lists the bank, its accounts and the consent end", () => {
    wrap(<BankConnectionPanel connection={base} accountOptions={options} now={now} today="2026-11-18" />);
    expect(screen.getByText("Mock ASPSP")).toBeInTheDocument();
    expect(screen.getByText("Conto corrente")).toBeInTheDocument();
    expect(screen.getByText("IT60 •••• 3456")).toBeInTheDocument();
    expect(screen.getByText(/valido fino al 17 maggio 2027 \(180 giorni\)/)).toBeInTheDocument();
    expect(screen.getByText("Attivo")).toBeInTheDocument();
    expect(screen.getByLabelText("Conto MonetIO")).toHaveValue("");
  });

  it("flags consents about to expire or expired", () => {
    const { rerender } = wrap(<BankConnectionPanel connection={{ ...base, validUntil: "2026-11-25T10:00:00Z" }} accountOptions={options} now={now} today="2026-11-18" />);
    expect(screen.getByText("In scadenza")).toBeInTheDocument();
    rerender(
      <ToastProvider>
        <BankConnectionPanel connection={{ ...base, status: "expired" }} accountOptions={options} now={now} today="2026-11-18" />
      </ToastProvider>,
    );
    expect(screen.getByText("Scaduto")).toBeInTheDocument();
  });

  it("asks before unlinking", async () => {
    wrap(<BankConnectionPanel connection={base} accountOptions={options} now={now} today="2026-11-18" />);
    await userEvent.click(screen.getByRole("button", { name: "Scollega" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Scollega" }).at(-1)!);
    expect(removeBankConnection).toHaveBeenCalledWith("c1");
  });

  it("shows the sync status only for linked accounts", () => {
    const linked = { ...base, accounts: [{ ...base.accounts[0], accountId: "acc-1", bankBalanceCents: 1000, syncConfirmedAt: "2026-11-18T09:00:00Z" }] };
    wrap(<BankConnectionPanel connection={linked} accountOptions={options} balances={{ "acc-1": 1000 }} now={now} today="2026-11-18" />);
    expect(screen.getByText("Allineato")).toBeInTheDocument();
  });

  it("shows the sync history of a linked account", () => {
    const linked = { ...base, accounts: [{ ...base.accounts[0], accountId: "acc-1", syncConfirmedAt: "2026-11-18T09:00:00Z" }] };
    const batches = { "acc-1": [{ id: "b1", accountId: "acc-1", kind: "worker" as const, inserted: 1, reconciled: 0, review: 0, createdAt: "2026-11-18T07:00:00Z", undoneAt: null }] };
    wrap(<BankConnectionPanel connection={linked} accountOptions={options} batches={batches} now={now} today="2026-11-18" />);
    expect(screen.getByRole("region", { name: "Ultimi aggiornamenti" })).toBeInTheDocument();
  });

  it("asks for the first-sync preview of a newly linked account, starting from its latest movement", () => {
    const pending = { ...base, accounts: [{ ...base.accounts[0], accountId: "acc-1" }] };
    wrap(<BankConnectionPanel connection={pending} accountOptions={options} lastBookedOn={{ "acc-1": "2026-11-10" }} now={now} today="2026-11-18" />);
    expect(screen.getByLabelText("Importa dal")).toHaveValue("2026-11-10");
    expect(screen.getByRole("button", { name: "Mostra anteprima" })).toBeInTheDocument();
    expect(screen.queryByText(/Prossimo/)).toBeNull();
  });

  it("says when the bank shared no account", () => {
    wrap(<BankConnectionPanel connection={{ ...base, accounts: [] }} accountOptions={options} now={now} today="2026-11-18" />);
    expect(screen.getByText("La banca non ha condiviso nessun conto.")).toBeInTheDocument();
  });
});
