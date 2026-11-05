import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, describedBy } from "./Field";

describe("Field", () => {
  it("links label to control", () => {
    render(
      <Field label="Payee" htmlFor="payee">
        <input id="payee" />
      </Field>,
    );
    expect(screen.getByLabelText("Payee")).toBeInTheDocument();
  });

  it("shows error instead of hint", () => {
    render(
      <Field label="Payee" htmlFor="p" hint="Who you paid" error="Required">
        <input id="p" />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.queryByText("Who you paid")).toBeNull();
  });

  it("computes describedBy ids", () => {
    expect(describedBy("a", "hint")).toBe("a-hint");
    expect(describedBy("a", "hint", "err")).toBe("a-error");
    expect(describedBy("a")).toBeUndefined();
  });
});
