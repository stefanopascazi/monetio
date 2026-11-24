import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BankConnection } from "@/lib/banking/connections";
import { AccountBankCard } from "./AccountBankCard";

const connection: BankConnection = {
  id: "c1",
  bankName: "Trade Republic",
  validUntil: "2099-01-01T00:00:00Z",
  status: "active",
  createdAt: "2026-11-21T09:00:00Z",
  lastSyncedAt: null,
  accounts: [
    {
      id: "ba1",
      name: "Conto TR",
      ibanMasked: null,
      currency: "EUR",
      accountId: "acc1",
      bankBalanceCents: null,
      bankBalanceOn: null,
      bankAvailableCents: 8719,
      lastSyncedAt: "2026-11-24T07:00:00Z",
      lastError: null,
      syncConfirmedAt: "2026-11-21T09:00:00Z",
      syncFrom: "2026-11-14",
      syncSlots: null,
    },
  ],
};

vi.mock("@/lib/data/bank-connections", () => ({ listMyBankConnections: vi.fn(async () => [connection]), lastBookedOnByAccount: vi.fn(async () => ({})) }));
vi.mock("@/lib/data/bank-sync-batches", () => ({ listRecentBankSyncBatches: vi.fn(async () => ({})) }));
vi.mock("@/lib/data/queries", () => ({ listCategories: vi.fn(async () => []) }));
vi.mock("@/app/actions/bank-sync-batches", () => ({ undoBankSync: vi.fn(), loadBankSyncBatchDetail: vi.fn() }));
vi.mock("@/app/actions/bank-sync", () => ({ previewBankSync: vi.fn(), confirmBankSync: vi.fn() }));
vi.mock("@/app/actions/bank-links", () => ({ linkBankAccount: vi.fn() }));

describe("AccountBankCard", () => {
  it("shows the bank's balances on the linked account, without the link choice", async () => {
    render(await AccountBankCard({ accountId: "acc1", balanceCents: 9719, today: "2026-11-24" }));
    expect(screen.getByText("Trade Republic")).toBeInTheDocument();
    expect(screen.getByText("Saldo disponibile")).toBeInTheDocument();
    expect(screen.getByText(/Movimenti da contabilizzare/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("renders nothing for an account no bank feeds", async () => {
    const { container } = render(await AccountBankCard({ accountId: "acc2", balanceCents: 0, today: "2026-11-24" }));
    expect(container).toBeEmptyDOMElement();
  });
});
