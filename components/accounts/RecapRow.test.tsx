import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { toTxnView } from "@/lib/data/views";
import { txn } from "@/lib/domain/fixtures";
import type { RecapItem } from "@/lib/domain/month-recap";
import { RecapRow } from "./RecapRow";

vi.mock("@/app/actions/estimates", () => ({ bookEstimate: vi.fn(), closeEstimate: vi.fn() }));
vi.mock("@/app/actions/overrides", () => ({ setOccurrenceAmount: vi.fn(), clearOccurrenceAmount: vi.fn() }));
vi.mock("@/app/actions/transactions", () => ({ confirmPlanned: vi.fn(), deleteTransaction: vi.fn(), updateTransaction: vi.fn(), createTransaction: vi.fn() }));

const accounts = [{ id: "a1", name: "Cointestato" }];
const planned = toTxnView(txn({ id: "t1", amountCents: -9000, bookedOn: "2026-11-25", description: "Dentista", status: "planned" }), accounts, []);
const editing = { planned: { t1: planned }, accounts, categories: [] };

const row = (item: RecapItem) =>
  render(
    <ToastProvider>
      <ul>
        <RecapRow item={item} today="2026-11-16" editing={editing} />
      </ul>
    </ToastProvider>,
  );

describe("RecapRow", () => {
  it("opens a planned movement on its book, edit and delete actions", () => {
    row({ key: "m1", date: "2026-11-25", label: "Dentista", source: "planned", amountCents: -9000, overdue: false, txnId: "t1" });
    fireEvent.click(screen.getByRole("button", { name: /Dentista/ }));
    expect(screen.getByRole("button", { name: "Registra come avvenuto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salva modifiche" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elimina movimento" })).toBeInTheDocument();
  });

  it("opens a rule occurrence on its actual amount and date, without delete", () => {
    row({ key: "m2", date: "2026-11-20", label: "Luce", source: "rule", amountCents: -5000, overdue: false, ref: "r:l|2026-11", occurrence: { dueDate: "2026-11-20", confirmed: false, note: null } });
    fireEvent.click(screen.getByRole("button", { name: /Luce/ }));
    expect(screen.getByRole("button", { name: "Salva importo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Scadenza")).toHaveValue("2026-11-20");
    expect(screen.queryByRole("button", { name: /Elimina/ })).not.toBeInTheDocument();
  });

  it("keeps contributions read-only", () => {
    row({ key: "m3", date: "2026-11-27", label: "Quota", source: "contribution", amountCents: -20000, overdue: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("quota")).toBeInTheDocument();
  });

  it("keeps the estimate actions of the current month", () => {
    row({ key: "m4", date: "2026-11-20", label: "Spesa", source: "estimate", amountCents: -4800, overdue: false, ref: "r:s|2026-11" });
    expect(screen.getByRole("button", { name: "Registra movimento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Spesa/ })).not.toBeInTheDocument();
  });
});
