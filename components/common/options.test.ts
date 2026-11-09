import { describe, expect, it } from "vitest";
import { categoryRefs, enumOptions, FREQUENCY_LABEL, selectableRefs, toOptions } from "./options";

describe("options", () => {
  it("builds select options", () => {
    expect(toOptions([{ id: "a", name: "Conto" }])).toEqual([{ value: "a", label: "Conto" }]);
    expect(enumOptions(FREQUENCY_LABEL)[1]).toEqual({ value: "monthly", label: "Mensile" });
  });

  it("hides archived categories unless already saved, labelling the kept ones", () => {
    const refs = categoryRefs([
      { id: "a", name: "Spesa", archived: false },
      { id: "b", name: "Vacanze", archived: true },
    ]);
    expect(selectableRefs(refs)).toEqual([{ id: "a", name: "Spesa", archived: false }]);
    expect(selectableRefs(refs, [null, "b"])).toEqual([
      { id: "a", name: "Spesa", archived: false },
      { id: "b", name: "Vacanze (archiviata)", archived: true },
    ]);
  });
});
