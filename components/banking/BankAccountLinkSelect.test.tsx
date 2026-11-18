import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { linkBankAccount } from "@/app/actions/bank-links";
import { BankAccountLinkSelect } from "./BankAccountLinkSelect";

vi.mock("@/app/actions/bank-links", () => ({ linkBankAccount: vi.fn() }));

const options = [
  { value: "acc-1", label: "Conto casa" },
  { value: "acc-2", label: "Carta" },
];
const wrap = (ui: React.ReactNode) => render(<ToastProvider>{ui}</ToastProvider>);

describe("BankAccountLinkSelect", () => {
  it("saves the chosen account", async () => {
    vi.mocked(linkBankAccount).mockResolvedValue({ ok: true, message: "Conto abbinato." });
    wrap(<BankAccountLinkSelect bankAccountId="ba-1" accountId={null} options={options} />);
    await userEvent.selectOptions(screen.getByLabelText("Conto MonetIO"), "acc-2");
    await waitFor(() => expect(linkBankAccount).toHaveBeenCalledWith("ba-1", "acc-2"));
    expect(screen.getByLabelText("Conto MonetIO")).toHaveValue("acc-2");
  });

  it("restores the previous choice when the server refuses", async () => {
    vi.mocked(linkBankAccount).mockResolvedValue({ ok: false, message: "Questo conto MonetIO riceve già i movimenti di un altro conto bancario." });
    wrap(<BankAccountLinkSelect bankAccountId="ba-1" accountId="acc-1" options={options} />);
    await userEvent.selectOptions(screen.getByLabelText("Conto MonetIO"), "acc-2");
    expect(await screen.findByText(/riceve già i movimenti/)).toBeInTheDocument();
    expect(screen.getByLabelText("Conto MonetIO")).toHaveValue("acc-1");
  });
});
