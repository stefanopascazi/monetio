import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormMessage } from "./FormMessage";

describe("FormMessage", () => {
  it("renders failures inline", () => {
    render(<FormMessage state={{ ok: false, message: "Campo obbligatorio" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campo obbligatorio");
  });

  it("hides success (reported by toast)", () => {
    const { container } = render(<FormMessage state={{ ok: true, message: "Salvato" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
