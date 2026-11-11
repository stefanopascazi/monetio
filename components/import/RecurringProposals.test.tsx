import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { RecurringProposals } from "./RecurringProposals";

const createRule = vi.hoisted(() => vi.fn(async () => ({ ok: true, message: "Ricorrenza aggiunta.", done: 1 })));
vi.mock("@/app/actions/rules", () => ({ createRule }));

const proposal = { key: "netflix|-1", description: "Netflix", amountCents: -1399, frequency: "monthly" as const, dayOfMonth: 6, startDate: "2026-12-06", occurrences: 4, lastDate: "2026-11-06", categoryId: "abb" };
const categories = [{ id: "abb", name: "Abbonamenti", kind: "expense" as const }];

describe("RecurringProposals", () => {
  it("renders nothing without proposals", () => {
    const { container } = render(<RecurringProposals accountId="acc" proposals={[]} categories={categories} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("creates the rule with the edited name and hides the proposal", async () => {
    render(
      <ToastProvider>
        <RecurringProposals accountId="acc" proposals={[proposal]} categories={categories} />
      </ToastProvider>,
    );
    expect(screen.getByText(/ogni mese, il giorno 6 · visto 4 volte, l'ultima il 6 nov 2026 · Abbonamenti/)).toBeInTheDocument();
    const name = screen.getByLabelText("Nome della regola");
    await userEvent.clear(name);
    await userEvent.type(name, "Netflix famiglia");
    await userEvent.click(screen.getByRole("button", { name: "Crea regola dal 6 dic 2026" }));
    await waitFor(() => expect(createRule).toHaveBeenCalledTimes(1));
    const fd = (createRule.mock.calls[0] as unknown as [unknown, FormData])[1];
    expect(fd.get("description")).toBe("Netflix famiglia");
    expect(fd.get("accountId")).toBe("acc");
    await waitFor(() => expect(screen.queryByText("Ricorrenze trovate")).not.toBeInTheDocument());
  });
});
