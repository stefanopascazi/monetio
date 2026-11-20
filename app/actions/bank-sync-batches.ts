"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

/** Undoes a bank sync batch: inserted movements deleted, merged ones restored, queued items removed. */
export async function undoBankSync(batchId: string): Promise<ActionState> {
  if (!isUUID(batchId)) return failure("Valori non validi.");
  await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("undo_bank_sync", { p_batch: batchId });
  if (error) {
    if (error.code === "P0002") return failure("Aggiornamento già annullato o non più disponibile.");
    if (error.code === "55000") return failure("Annulla prima gli aggiornamenti più recenti.");
    return failure(dbErrorMessage(error));
  }
  refresh();
  const n = Number(data ?? 0);
  return success(n ? `Aggiornamento annullato: ${n === 1 ? "1 movimento cancellato" : `${n} movimenti cancellati`}.` : "Aggiornamento annullato.");
}
