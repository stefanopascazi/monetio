import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatisticsFilters } from "./StatisticsFilters";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const accounts = [
  { id: "a1", name: "Cointestato" },
  { id: "a2", name: "Carta" },
];

describe("StatisticsFilters", () => {
  beforeEach(() => push.mockClear());

  it("keeps account and period in the URL", async () => {
    render(<StatisticsFilters accounts={accounts} accountId={null} period="6" />);
    await userEvent.selectOptions(screen.getByLabelText("Conto"), "a2");
    expect(push).toHaveBeenLastCalledWith("/analisi/statistiche?conto=a2", { scroll: false });
    await userEvent.click(screen.getByRole("radio", { name: "12 mesi" }));
    expect(push).toHaveBeenLastCalledWith("/analisi/statistiche?mesi=12", { scroll: false });
  });

  it("drops the account when going back to all accounts", async () => {
    render(<StatisticsFilters accounts={accounts} accountId="a1" period="3" />);
    await userEvent.selectOptions(screen.getByLabelText("Conto"), "");
    expect(push).toHaveBeenLastCalledWith("/analisi/statistiche?mesi=3", { scroll: false });
  });
});
