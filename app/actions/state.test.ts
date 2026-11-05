import { describe, expect, it } from "vitest";
import { dbErrorMessage, failure, success } from "./state";

describe("action state", () => {
  it("counts successes", () => {
    expect(success("Fatto", success("Fatto"))).toEqual({ ok: true, message: "Fatto", done: 2 });
    expect(failure("No", { a: "b" })).toEqual({ ok: false, message: "No", errors: { a: "b" } });
  });

  it("maps database errors", () => {
    expect(dbErrorMessage({ code: "23505" })).toBe("Questo elemento esiste già.");
    expect(dbErrorMessage({ message: "new row violates row-level security policy" })).toBe("Non hai i permessi per questa operazione.");
    expect(dbErrorMessage(null)).toBe("Operazione non riuscita. Riprova.");
  });
});
