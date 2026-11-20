"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { BankSetupMissing } from "@/lib/banking/bank-service";
import type { PsuContext } from "@/lib/banking/enable-banking/client";
import { bankService } from "@/lib/banking/server";
import { confirmItems, previewItems, type SyncPreview } from "@/lib/banking/sync/preview";
import { planSync, type SyncPlan } from "@/lib/banking/sync/run";
import { createPreviewSyncStore } from "@/lib/data/bank-sync-store";
import { getContext } from "@/lib/data/context";
import { todayISO } from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";
import { isISODate, isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

export type PreviewResult = ActionState & { preview?: SyncPreview };

const NOT_PENDING = "Questo conto è già attivo, non è più abbinato o il consenso è scaduto.";

/** The person's IP and browser, so the bank counts these reads as user-initiated. */
async function psuContext(): Promise<PsuContext | undefined> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  return ip ? { ipAddress: ip, userAgent: h.get("user-agent") } : undefined;
}

type Planned = { ok: true; plan: SyncPlan } | { ok: false; state: ActionState };

/** Reads the bank from `from` and decides every movement; shared by preview and confirm. */
async function plan(bankAccountId: string, from: string): Promise<Planned> {
  if (!isUUID(bankAccountId) || !isISODate(from)) return { ok: false, state: failure("Valori non validi.") };
  const ctx = await getContext();
  if (from > todayISO()) return { ok: false, state: failure("La data di partenza non può essere futura.") };
  let service;
  try {
    service = bankService();
  } catch {
    return { ok: false, state: failure("Il collegamento alle banche non è ancora configurato sul server.") };
  }
  try {
    const pending = await service.previewContext({ userId: ctx.userId, bankAccountId, psu: await psuContext() });
    if (!pending) return { ok: false, state: failure(NOT_PENDING) };
    const store = createPreviewSyncStore(await createClient());
    return { ok: true, plan: await planSync({ ...pending.target, syncFrom: from as ISODate }, pending.client, store) };
  } catch (error) {
    if (error instanceof BankSetupMissing) return { ok: false, state: failure("Prima carica la tua app Enable Banking.") };
    console.error("[banking] sync preview failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, state: failure("La banca non ha risposto. Riprova tra qualche minuto.") };
  }
}

/** What the first sync would bring in from `from`, without writing anything. */
export async function previewBankSync(bankAccountId: string, from: string): Promise<PreviewResult> {
  const res = await plan(bankAccountId, from);
  if (!res.ok) return res.state;
  return { ok: true, preview: { from: res.plan.from, items: previewItems(res.plan.decisions), balance: res.plan.balance } };
}

/** Writes the chosen movements (read again from the bank, never trusted from the browser) and starts the regular sync. */
export async function confirmBankSync(bankAccountId: string, from: string, selectedRefs: string[]): Promise<ActionState> {
  if (!Array.isArray(selectedRefs) || selectedRefs.some((r) => typeof r !== "string" || r.length > 120)) return failure("Valori non validi.");
  const res = await plan(bankAccountId, from);
  if (!res.ok) return res.state;
  const items = confirmItems(res.plan.decisions, selectedRefs);
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_bank_sync", {
    p_bank_account: bankAccountId,
    p_from: res.plan.from,
    p_balance_cents: res.plan.balance?.cents ?? null,
    p_balance_on: res.plan.balance?.date ?? null,
    p_decisions: items,
  });
  if (error) {
    if (error.code === "P0002") return failure(NOT_PENDING);
    return failure(dbErrorMessage(error));
  }
  refresh();
  const added = items.filter((i) => i.type === "insert").length;
  return success(
    added ? `${added === 1 ? "Importato 1 movimento" : `Importati ${added} movimenti`}. Da ora il conto si aggiorna da solo.` : "Collegamento confermato. Da ora il conto si aggiorna da solo.",
  );
}
