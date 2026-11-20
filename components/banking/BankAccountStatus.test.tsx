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
  syncConfirmedAt: "2026-11-18T13:19:58Z",
  syncFrom: "2026-11-01",
};
const now = new Date("2026-11-20T08:00:00Z");

describe("BankAccountStatus", () => {
  it("shows both balances, the gap and the last sync", () => {
    render(<BankAccountStatus account={account} monetioBalanceCents={-786} now={now} />);
    expect(screen.getByText(/Saldo banca/)).toBeInTheDocument();
    expect(screen.getByText(/Differenza/)).toBeInTheDocument();
    expect(screen.getByText(/Ultimo aggiornamento 18 nov.* · Prossimo oggi alle 12:00/)).toBeInTheDocument();
  });

  it("marks aligned balances", () => {
    render(<BankAccountStatus account={account} monetioBalanceCents={3214} />);
    expect(screen.getByText("Allineato")).toBeInTheDocument();
  });

  it("shows the sync error and when the next run comes", () => {
    render(
      <BankAccountStatus account={{ ...account, bankBalanceCents: null, lastSyncedAt: null, lastError: "Banca non raggiungibile" }} monetioBalanceCents={0} now={now} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Banca non raggiungibile");
    expect(screen.getByText("Prossimo oggi alle 12:00")).toBeInTheDocument();
    expect(screen.queryByText(/Saldo banca/)).toBeNull();
  });
});
