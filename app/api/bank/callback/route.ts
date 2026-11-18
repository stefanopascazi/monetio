import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkCallback } from "@/lib/banking/link";
import { BANK_STATE_COOKIE, bankService } from "@/lib/banking/server";
import { getContext } from "@/lib/data/context";

// Return point of the bank's consent flow: checks the state cookie, exchanges the code for a
// session and stores it, then sends the person back to "Banche collegate" with the outcome.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (esito: string) => NextResponse.redirect(new URL(`/dati/banche?esito=${esito}`, url.origin));
  const ctx = await getContext();

  const jar = await cookies();
  const expected = jar.get(BANK_STATE_COOKIE)?.value ?? null;
  jar.delete({ name: BANK_STATE_COOKIE, path: "/api/bank" });

  const check = checkCallback(
    { code: url.searchParams.get("code"), state: url.searchParams.get("state"), error: url.searchParams.get("error"), errorDescription: url.searchParams.get("error_description") },
    expected,
  );
  if (!check.ok) return back(check.reason === "denied" ? "negata" : check.reason === "state" ? "scaduta" : "errore");

  try {
    await bankService().completeLink({ userId: ctx.userId, householdId: ctx.householdId, code: check.code });
    return back("collegata");
  } catch (error) {
    console.error("[banking] complete link failed", error instanceof Error ? error.name : "unknown");
    return back("errore");
  }
}
