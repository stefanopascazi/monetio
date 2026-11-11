import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AccountBankFields } from "./AccountBankFields";

function Harness({ ibanMasked = null as string | null }) {
  const [remove, setRemove] = useState(false);
  return <AccountBankFields defaults={{ ibanMasked, bic: "BPMOIT22", cardLast4: ["1234", "5678"] }} removeIban={remove} onRemoveIbanChange={setRemove} error={() => undefined} />;
}

describe("AccountBankFields", () => {
  it("never pre-fills the IBAN and shows only its masked form", async () => {
    render(<Harness ibanMasked="IT60 •••• 3456" />);
    const iban = screen.getByRole("textbox", { name: /^IBAN/ });
    expect(iban).toHaveValue("");
    expect(screen.getByText(/Salvato: IT60 •••• 3456/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("switch", { name: "Rimuovi IBAN" }));
    expect(iban).toBeDisabled();
  });

  it("pre-fills BIC and cards, without a remove switch when no IBAN is saved", () => {
    render(<Harness />);
    expect(screen.getByLabelText(/BIC/)).toHaveValue("BPMOIT22");
    expect(screen.getByLabelText(/Carte collegate/)).toHaveValue("1234, 5678");
    expect(screen.queryByRole("switch", { name: "Rimuovi IBAN" })).toBeNull();
  });
});
