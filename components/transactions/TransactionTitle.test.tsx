import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { txn } from "../../lib/domain/fixtures";
import { toTxnView } from "../../lib/data/views";
import { TransactionTitle } from "./TransactionTitle";

const members = [{ userId: "u1", displayName: "Ste" }];
const view = (createdBy: string | null) => toTxnView(txn({ amountCents: -100, bookedOn: "2026-11-01", description: "Spesa", createdBy }), [{ id: "a1", name: "Cointestato" }], [], members);

describe("TransactionTitle", () => {
  it("shows who created the transaction", () => {
    render(<TransactionTitle t={view("u1")} />);
    expect(screen.getByText(/Cointestato · .* · di Ste/)).toBeInTheDocument();
  });

  it("omits the creator when unknown", () => {
    render(<TransactionTitle t={view(null)} />);
    expect(screen.queryByText(/di /)).not.toBeInTheDocument();
  });

  it("labels bonifico payments and their fees", () => {
    const pay = toTxnView(txn({ amountCents: -300000, bookedOn: "2026-11-01", paymentMethod: "bank_transfer" }), [{ id: "a1", name: "Cointestato" }], []);
    const { unmount } = render(<TransactionTitle t={pay} />);
    expect(screen.getByText(/^Bonifico · Cointestato/)).toBeInTheDocument();
    unmount();
    render(<TransactionTitle t={toTxnView(txn({ amountCents: -65, bookedOn: "2026-11-01", parentTransactionId: "p" }), [{ id: "a1", name: "Cointestato" }], [])} />);
    expect(screen.getByText(/^Spese · Cointestato/)).toBeInTheDocument();
  });
});
