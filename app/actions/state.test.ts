import { describe, expect, it, vi } from "vitest";
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

  it("logs unmapped database errors", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(dbErrorMessage({ code: "23502", message: "null value in column \"id\"" })).toBe("Operazione non riuscita. Riprova.");
    expect(log).toHaveBeenCalledWith("[db]", "23502", 'null value in column "id"');
    log.mockRestore();
  });
});
