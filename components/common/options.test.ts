import { describe, expect, it } from "vitest";
import { enumOptions, FREQUENCY_LABEL, toOptions } from "./options";

describe("options", () => {
  it("builds select options", () => {
    expect(toOptions([{ id: "a", name: "Conto" }])).toEqual([{ value: "a", label: "Conto" }]);
    expect(enumOptions(FREQUENCY_LABEL)[1]).toEqual({ value: "monthly", label: "Mensile" });
  });
});
