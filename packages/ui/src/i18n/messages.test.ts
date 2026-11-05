import { describe, expect, it as test } from "vitest";
import { en, it } from "./messages";

function keysDeep(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keysDeep(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
}

describe("messages", () => {
  test("Italian covers every English key", () => {
    expect(keysDeep(it).sort()).toEqual(keysDeep(en).sort());
  });

  test("Italian plural helpers", () => {
    expect(it.daysOverdue(1)).toBe("Scaduto da 1 giorno");
    expect(it.daysOverdue(3)).toBe("Scaduto da 3 giorni");
    expect(it.inDays(5)).toBe("Tra 5 giorni");
    expect(it.visibility.youAnd(1)).toBe("Tu e 1 altra persona");
  });
});
