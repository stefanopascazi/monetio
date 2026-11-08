import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DecreasingEstimateFields } from "./DecreasingEstimateFields";

const categories = [
  { id: "salute", name: "Salute" },
  { id: "terapia", name: "Terapia" },
];
const values = (container: HTMLElement, name: string) => [...container.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)].map((i) => i.value);

describe("DecreasingEstimateFields", () => {
  it("starts off and posts no categories", () => {
    const { container } = render(<DecreasingEstimateFields categories={categories} />);
    expect(values(container, "decreasing")).toEqual(["false"]);
    expect(screen.queryByText("Categorie da scalare")).not.toBeInTheDocument();
  });

  it("lets the user pick one or more categories once enabled", async () => {
    const { container } = render(<DecreasingEstimateFields categories={categories} />);
    await userEvent.click(screen.getByRole("switch", { name: /A scalare/ }));
    await userEvent.click(screen.getByRole("button", { name: "Salute" }));
    await userEvent.click(screen.getByRole("button", { name: "Terapia" }));
    expect(values(container, "decreasing")).toEqual(["true"]);
    expect(values(container, "decrementCategoryIds")).toEqual(["salute", "terapia"]);
  });

  it("opens with the saved categories of a decreasing estimate", () => {
    const { container } = render(<DecreasingEstimateFields categories={categories} initial={["terapia"]} error="Errore" />);
    expect(values(container, "decrementCategoryIds")).toEqual(["terapia"]);
    expect(screen.getByText("Errore")).toBeInTheDocument();
  });
});
