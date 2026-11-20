import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@monetio/ui";
import { assignGroupCategory } from "@/app/actions/category-matches";
import { UncategorisedGroups } from "./UncategorisedGroups";

vi.mock("@/app/actions/category-matches", () => ({ assignGroupCategory: vi.fn(async () => ({ ok: true, message: "Fatto." })) }));

const categories = [
  { id: "bar", name: "Bar", kind: "expense" as const },
  { id: "stip", name: "Stipendio", kind: "income" as const },
];
const groups = [{ key: "bar roma", direction: -1 as const, description: "BAR ROMA 10/11", count: 3, totalCents: -900 }];

beforeEach(() => vi.clearAllMocks());

describe("UncategorisedGroups", () => {
  it("says when everything is categorised", () => {
    render(<UncategorisedGroups accountId="acc1" groups={[]} categories={categories} />);
    expect(screen.getByText(/hanno una categoria/)).toBeInTheDocument();
  });

  it("shows count and offers only categories of the group's direction", () => {
    render(<UncategorisedGroups accountId="acc1" groups={groups} categories={categories} />);
    expect(screen.getByText("3 movimenti")).toBeInTheDocument();
    const select = screen.getByLabelText("Categoria per BAR ROMA 10/11");
    expect(select).toHaveTextContent("Bar");
    expect(select).not.toHaveTextContent("Stipendio");
    expect(screen.getByRole("button", { name: "Assegna" })).toBeDisabled();
  });

  it("assigns the chosen category to the group", async () => {
    render(
      <ToastProvider>
        <UncategorisedGroups accountId="acc1" groups={groups} categories={categories} />
      </ToastProvider>,
    );
    await userEvent.selectOptions(screen.getByLabelText("Categoria per BAR ROMA 10/11"), "bar");
    await userEvent.click(screen.getByRole("button", { name: "Assegna" }));
    expect(assignGroupCategory).toHaveBeenCalledWith("acc1", "BAR ROMA 10/11", -1, "bar");
  });
});
