import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraftStatusNote } from "./DraftStatusNote";

const match = { id: "t1", accountId: "cherry", accountName: "Conto cointestato", bookedOn: "2026-11-04", amountCents: -80000, description: "Ricarica conto personale", categoryId: null };

describe("DraftStatusNote", () => {
  it("renders nothing for new rows", () => {
    const { container } = render(<DraftStatusNote status={{ kind: "new" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels duplicates, rows before opening and possible duplicates", () => {
    const { rerender } = render(<DraftStatusNote status={{ kind: "duplicate" }} />);
    expect(screen.getByText("Già presente")).toBeInTheDocument();
    rerender(<DraftStatusNote status={{ kind: "beforeOpening" }} />);
    expect(screen.getByText("Prima dell'apertura")).toBeInTheDocument();
    rerender(<DraftStatusNote status={{ kind: "possible", match: { bookedOn: "2026-11-02", amountCents: -1, description: "Bolletta" } }} />);
    expect(screen.getByText(/Simile a “Bolletta” del 2 nov 2026/)).toBeInTheDocument();
  });

  it("shows the other side of a giroconto and toggles the link when selected", async () => {
    const onLinkChange = vi.fn();
    const { rerender } = render(<DraftStatusNote status={{ kind: "transfer", match }} selected linked onLinkChange={onLinkChange} />);
    expect(screen.getByText("Giroconto con Conto cointestato")).toBeInTheDocument();
    expect(screen.getByText(/Altro lato: “Ricarica conto personale” del 4 nov 2026/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: "Collega come giroconto" }));
    expect(onLinkChange).toHaveBeenCalledWith(false);
    rerender(<DraftStatusNote status={{ kind: "transfer", match }} selected={false} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("explains a giroconto recognised by IBAN whose other side will be created", () => {
    render(<DraftStatusNote status={{ kind: "transferNew", account: { id: "a2", name: "Conto privato di Asha" }, via: "iban" }} selected linked />);
    expect(screen.getByText("Giroconto con Conto privato di Asha")).toBeInTheDocument();
    expect(screen.getByText(/Riconosciuto dall'IBAN\. L'altro lato non è ancora registrato: verrà creato/)).toBeInTheDocument();
  });
});
