import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BankConnectionAccount } from "@/lib/banking/connections";
import { BankAccountStatus } from "./BankAccountStatus";

const account: BankConnectionAccount = {
  id: "a1",
  name: "Conto",
  ibanMasked: null,
  currency: "EUR",
  accountId: "acc1",
  bankBalanceCents: 3214,
  bankBalanceOn: null,
  lastSyncedAt: "2026-11-18T13:19:58Z",
  lastError: null,
};

describe("BankAccountStatus", () => {
  it("shows both balances, the gap and the last sync", () => {
    render(<BankAccountStatus account={account} monetioBalanceCents={-786} />);
    expect(screen.getByText(/Saldo banca/)).toBeInTheDocument();
    expect(screen.getByText(/Differenza/)).toBeInTheDocument();
    expect(screen.getByText(/Ultimo aggiornamento 18 nov/)).toBeInTheDocument();
  });

  it("marks aligned balances", () => {
    render(<BankAccountStatus account={account} monetioBalanceCents={3214} />);
    expect(screen.getByText("Allineato")).toBeInTheDocument();
  });

  it("shows the sync error and the wait before the first sync", () => {
    render(
      <BankAccountStatus account={{ ...account, bankBalanceCents: null, lastSyncedAt: null, lastError: "Banca non raggiungibile" }} monetioBalanceCents={0} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Banca non raggiungibile");
    expect(screen.getByText(/Non ancora aggiornato/)).toBeInTheDocument();
    expect(screen.queryByText(/Saldo banca/)).toBeNull();
  });
});
