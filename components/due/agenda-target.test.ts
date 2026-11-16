import { describe, expect, it } from "vitest";
import { agendaTarget } from "./agenda-target";

const id = "0b7c4a52-8f1e-4c2a-9a55-3f2d1e0c9b11";

describe("agendaTarget", () => {
  it("maps the section to its tab and keeps a valid id to open", () => {
    expect(agendaTarget({ sezione: "ricorrenze", apri: id })).toEqual({ tab: "rules", open: id });
    expect(agendaTarget({ sezione: ["quote"], apri: [id] })).toEqual({ tab: "quote", open: id });
  });

  it("ignores unknown sections and malformed ids", () => {
    expect(agendaTarget({})).toEqual({});
    expect(agendaTarget({ sezione: "altro", apri: id })).toEqual({});
    expect(agendaTarget({ sezione: "ricorrenze", apri: "x" })).toEqual({ tab: "rules" });
  });
});
