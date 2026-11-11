"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { mapCategory } from "@/lib/data/mappers";
import { addDays } from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";
import { classifyDrafts, type DraftStatus, POSSIBLE_WINDOW_DAYS } from "@/lib/import/classify";
import type { Movement } from "@/lib/import/dedup";
import { parseDrafts } from "@/lib/import/payload";
import { type PlainCell, readStatement } from "@/lib/import/read";
import { importRows } from "@/lib/import/rows";
import type { ImportDraft } from "@/lib/import/types";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

type Client = Awaited<ReturnType<typeof createClient>>;
const PAGE = 1000;
const CHUNK = 500;

export type ReadStatementResult = { ok: true; grid: PlainCell[][] } | { ok: false; message: string };

export async function readStatementFile(fd: FormData): Promise<ReadStatementResult> {
  await getContext();
  const file = fd.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Scegli un file da importare." };
  return readStatement(file.name, await file.arrayBuffer());
}

/** Account movements around the drafts' dates (all statuses: planned ones get booked later). */
async function movementsAround(supabase: Client, accountId: string, drafts: ImportDraft[]): Promise<Movement[]> {
  const dates = drafts.map((d) => d.bookedOn).sort();
  const from = addDays(dates[0], -POSSIBLE_WINDOW_DAYS);
  const to = addDays(dates[dates.length - 1], POSSIBLE_WINDOW_DAYS);
  const out: Movement[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("transactions")
      .select("booked_on, amount_cents, description")
      .eq("account_id", accountId)
      .gte("booked_on", from)
      .lte("booked_on", to)
      .order("id")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) out.push({ bookedOn: String(r.booked_on), amountCents: Number(r.amount_cents), description: String(r.description) });
    if ((data?.length ?? 0) < PAGE) return out;
  }
}

/** Visible, active account of the current household (RLS hides the others). */
async function loadAccount(supabase: Client, householdId: string, accountId: string) {
  if (!isUUID(accountId)) return null;
  const { data } = await supabase.from("accounts").select("id, opening_date, archived").eq("id", accountId).eq("household_id", householdId).maybeSingle();
  return data && !data.archived ? { id: String(data.id), openingDate: String(data.opening_date) as ISODate } : null;
}

export type PreviewResult = { ok: true; statuses: DraftStatus[]; openingDate: ISODate } | { ok: false; message: string };

export async function previewImport(accountId: string, payload: unknown): Promise<PreviewResult> {
  const ctx = await getContext();
  const drafts = parseDrafts(payload);
  if (!drafts) return { ok: false, message: "Nessun movimento valido da controllare." };
  const supabase = await createClient();
  const account = await loadAccount(supabase, ctx.householdId, accountId);
  if (!account) return { ok: false, message: "Conto non trovato." };
  const existing = await movementsAround(supabase, account.id, drafts);
  return { ok: true, statuses: classifyDrafts(drafts, existing, account.openingDate), openingDate: account.openingDate };
}

/**
 * Imports the drafts the user kept. Exact duplicates and movements covered by the opening
 * balance are dropped again here; possible duplicates are imported because the user chose them.
 */
export async function importStatement(accountId: string, payload: unknown): Promise<ActionState> {
  const ctx = await getContext();
  const drafts = parseDrafts(payload);
  if (!drafts) return failure("Nessun movimento valido da importare.");
  const supabase = await createClient();
  const account = await loadAccount(supabase, ctx.householdId, accountId);
  if (!account) return failure("Conto non trovato.");

  const existing = await movementsAround(supabase, account.id, drafts);
  const statuses = classifyDrafts(drafts, existing, account.openingDate);
  const keep = drafts.filter((_, i) => statuses[i].kind === "new" || statuses[i].kind === "possible");
  if (!keep.length) return failure("Tutti i movimenti scelti sono già presenti.");

  const { data: cats, error: catError } = await supabase.from("categories").select("*").eq("household_id", ctx.householdId);
  if (catError) return failure(dbErrorMessage(catError));
  const rows = importRows(keep, { householdId: ctx.householdId, accountId: account.id, categories: (cats ?? []).map(mapCategory) });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // Import refs are unique: rows already imported are skipped instead of failing the batch.
    const { data, error } = await supabase
      .from("transactions")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "import_ref", ignoreDuplicates: true })
      .select("id");
    if (error) return failure(inserted ? `Importati ${inserted} movimenti, poi: ${dbErrorMessage(error)}` : dbErrorMessage(error));
    inserted += data?.length ?? 0;
  }
  refresh();
  return success(inserted === 1 ? "1 movimento importato." : `${inserted} movimenti importati.`);
}
