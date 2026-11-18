"use server";

import { cookies, headers } from "next/headers";
import { refresh } from "next/cache";
import { bankCallbackUrl, requestOrigin } from "@/lib/banking/bank-app";
import { BankSetupMissing } from "@/lib/banking/bank-service";
import { BANK_STATE_COOKIE, bankService } from "@/lib/banking/server";
import { getContext } from "@/lib/data/context";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

export type StartLinkResult = ActionState & { url?: string };

/** Ten minutes to complete the bank's consent flow. */
const STATE_MAX_AGE = 600;

function serviceOrNull() {
  try {
    return bankService();
  } catch {
    console.error("[banking] BANK_KEYS_SECRET missing or invalid");
    return null;
  }
}

/** Starts the consent flow at a bank: returns the bank URL; the browser navigates there. */
export async function startBankLink(aspspName: string, country = "IT"): Promise<StartLinkResult> {
  if (!aspspName || aspspName.length > 120 || !/^[A-Z]{2}$/.test(country)) return failure("Scegli una banca dall'elenco.");
  const ctx = await getContext();
  const service = serviceOrNull();
  if (!service) return failure("Il collegamento alle banche non è ancora configurato sul server.");
  const h = await headers();
  try {
    const res = await service.startLink({ userId: ctx.userId, aspspName, country, redirectUrl: bankCallbackUrl(requestOrigin((n) => h.get(n))) });
    if (!res.ok) return failure(res.message);
    (await cookies()).set(BANK_STATE_COOKIE, res.state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/bank",
      maxAge: STATE_MAX_AGE,
    });
    return { ok: true, url: res.url };
  } catch (error) {
    if (error instanceof BankSetupMissing) return failure("Prima carica la tua app Enable Banking.");
    console.error("[banking] start link failed", error instanceof Error ? error.name : "unknown");
    return failure("Enable Banking non ha avviato il collegamento. Riprova tra qualche minuto.");
  }
}

/** Chooses the MonetIO account fed by a bank account; an empty id unlinks it. */
export async function linkBankAccount(bankAccountId: string, accountId: string): Promise<ActionState> {
  if (!isUUID(bankAccountId) || (accountId && !isUUID(accountId))) return failure("Valori non validi.");
  await getContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_bank_account", { p_bank_account: bankAccountId, p_account: accountId || null });
  if (error) {
    if (error.code === "23505") return failure("Questo conto MonetIO riceve già i movimenti di un altro conto bancario.");
    return failure(dbErrorMessage(error));
  }
  refresh();
  return success(accountId ? "Conto abbinato." : "Abbinamento rimosso.");
}

/** Revokes a consent and removes it with its accounts (only the caller's own). */
export async function removeBankConnection(connectionId: string): Promise<ActionState> {
  if (!isUUID(connectionId)) return failure("Collegamento non valido.");
  const ctx = await getContext();
  const service = serviceOrNull();
  if (!service) return failure("Il collegamento alle banche non è ancora configurato sul server.");
  try {
    const removed = await service.removeLink({ userId: ctx.userId, connectionId });
    if (!removed) return failure("Collegamento non trovato.");
  } catch {
    return failure("Non è stato possibile rimuovere il collegamento. Riprova.");
  }
  refresh();
  return success("Banca scollegata.");
}
