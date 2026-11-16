import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { toTxnView } from "@/lib/data/views";
import { contribution, rule, txn } from "@/lib/domain/fixtures";
import type { RecapItem } from "@/lib/domain/month-recap";
import { recapRules } from "./recap-origin";
import { RecapRow } from "./RecapRow";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/app/actions/estimates", () => ({ bookEstimate: vi.fn(), closeEstimate: vi.fn() }));
vi.mock("@/app/actions/overrides", () => ({ setOccurrenceAmount: vi.fn(), clearOccurrenceAmount: vi.fn() }));
vi.mock("@/app/actions/rules", () => ({ markEntryPaid: vi.fn() }));
vi.mock("@/app/actions/transactions", () => ({ confirmPlanned: vi.fn(), deleteTransaction: vi.fn(), updateTransaction: vi.fn() }));

const accounts = [{ id: "a1", name: "Cointestato" }];
const planned = toTxnView(txn({ id: "t1", amountCents: -9000, bookedOn: "2026-11-25", description: "Dentista", status: "planned" }), accounts, []);
const rules = recapRules(
  [
    rule({ id: "luce", amountCents: -100, description: "Luce", schedule: "due", dayOfMonth: 20, startDate: "2026-01-20" }),
    rule({ id: "mutuo", amountCents: -100, description: "Mutuo", schedule: "auto", dayOfMonth: 27, startDate: "2026-01-27" }),
    rule({ id: "spesa", amountCents: -100, description: "Spesa", schedule: "estimate", dayOfMonth: 1, startDate: "2026-01-01" }),
  ],
  [contribution({ id: "q", description: "Quota casa", dayOfMonth: 28, startDate: "2026-01-28" })],
);
const editing = { planned: { t1: planned }, rules, accounts, categories: [] };
const occurrence = (dueDate: string) => ({ dueDate, confirmed: false, note: null });

const row = (item: RecapItem, today: string | undefined = "2026-11-16") =>
  render(
    <ToastProvider>
      <ul>
        <RecapRow item={item} today={today} editing={editing} />
      </ul>
    </ToastProvider>,
  );
const open = (name: RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("RecapRow", () => {
  it("opens a planned movement on its origin and its book, edit and delete actions", () => {
    row({ key: "m1", date: "2026-11-25", label: "Dentista", source: "planned", amountCents: -9000, overdue: false, txnId: "t1" });
    open(/Dentista/);
    expect(screen.getByText(/Movimento singolo pianificato/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registra come avvenuto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salva modifiche" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elimina movimento" })).toBeInTheDocument();
  });

  it("explains a due rule, links to it and keeps paying apart from correcting", () => {
    row({ key: "m2", date: "2026-11-20", label: "Luce", source: "rule", amountCents: -5000, overdue: false, ref: "r:luce|2026-11", ruleId: "luce", occurrence: occurrence("2026-11-20") });
    expect(screen.getByText("scadenza")).toBeInTheDocument();
    open(/Luce/);
    expect(screen.getByText(/Ricorrenza a scadenza «Luce» · Ogni mese il giorno 20/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Apri la ricorrenza/ })).toHaveAttribute("href", "/scadenze?sezione=ricorrenze&apri=luce");
    fireEvent.click(screen.getByRole("button", { name: "Registra pagamento" }));
    expect(screen.getByLabelText("Pagato il")).toHaveValue("2026-11-16");
  });

  it("corrects a due rule occurrence saying it does not book the payment", () => {
    row({ key: "m2", date: "2026-11-20", label: "Luce", source: "rule", amountCents: -5000, overdue: false, ref: "r:luce|2026-11", ruleId: "luce", occurrence: occurrence("2026-11-20") });
    open(/Luce/);
    fireEvent.click(screen.getByRole("button", { name: "Correggi importo o data" }));
    expect(screen.getByText(/Non registra il pagamento/)).toBeInTheDocument();
    expect(screen.getByLabelText("Scadenza")).toHaveValue("2026-11-20");
  });

  it("offers no payment for automatic rules nor outside the current month", () => {
    row({ key: "m3", date: "2026-11-27", label: "Mutuo", source: "rule", amountCents: -78000, overdue: false, ref: "r:mutuo|2026-11", ruleId: "mutuo", occurrence: occurrence("2026-11-27") });
    expect(screen.getByText("automatico")).toBeInTheDocument();
    open(/Mutuo/);
    expect(screen.getByText(/Si registra da sola il/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registra pagamento" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correggi importo o data" })).toBeInTheDocument();
  });

  it("books a contribution from the current month only", () => {
    const item: RecapItem = { key: "m4", date: "2026-11-28", label: "Quota casa", source: "contribution", amountCents: -20000, overdue: false, ref: "c:q|2026-11", ruleId: "q" };
    const { unmount } = row(item);
    open(/Quota casa/);
    expect(screen.getByRole("link", { name: /Apri la ricorrenza/ })).toHaveAttribute("href", "/scadenze?sezione=quote&apri=q");
    expect(screen.getByRole("button", { name: "Registra pagamento" })).toBeInTheDocument();
    unmount();
    row(item, "");
    open(/Quota casa/);
    expect(screen.queryByRole("button", { name: "Registra pagamento" })).not.toBeInTheDocument();
  });

  it("opens an estimate on its origin and actions", () => {
    row({ key: "m5", date: "2026-11-20", label: "Spesa", source: "estimate", amountCents: -4800, overdue: false, ref: "r:spesa|2026-11", ruleId: "spesa" });
    open(/Spesa/);
    expect(screen.getByText(/Stima «Spesa»/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registra movimento" })).toBeInTheDocument();
  });
});
