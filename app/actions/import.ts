"use server";

import { refresh } from "next/cache";
import { getContext } from "@/lib/data/context";
import { accountHistory, accountRules, categorisedHistory, linkTransferSides, loadImportAccount, movementsAround, transferCandidates } from "@/lib/data/import-db";
import { mapCategory } from "@/lib/data/mappers";
import { todayISO } from "@/lib/domain/dates";
import type { ISODate } from "@/lib/domain/types";
import { batchStats, parseImportMeta } from "@/lib/import/batch";
import { validCategory } from "@/lib/import/categories";
import { classifyDrafts, type DraftStatus } from "@/lib/import/classify";
import { buildInsights, type ImportInsights } from "@/lib/import/insights";
import { parseCategoryChoices, parseDrafts } from "@/lib/import/payload";
import { type PlainCell, readStatement } from "@/lib/import/read";
import { importRows } from "@/lib/import/rows";
import { confirmedLinks, detectTransfers, parseLinks } from "@/lib/import/transfers";
import type { ImportDraft } from "@/lib/import/types";
import { isUUID } from "@/lib/forms/parse";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, dbErrorMessage, failure, success } from "./state";

type Client = Awaited<ReturnType<typeof createClient>>;
const CHUNK = 500;

export type ReadStatementResult = { ok: true; grid: PlainCell[][] } | { ok: false; message: string };

export async function readStatementFile(fd: FormData): Promise<ReadStatementResult> {
  await getContext();
  const file = fd.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Scegli un file da importare." };
  return readStatement(file.name, await file.arrayBuffer());
}

/** Duplicates and opening balance on the target account, then giroconti with the other accounts. */
async function classify(supabase: Client, householdId: string, accountId: string, openingDate: ISODate, drafts: ImportDraft[]): Promise<DraftStatus[]> {
  const [existing, candidates] = await Promise.all([movementsAround(supabase, accountId, drafts), transferCandidates(supabase, householdId, accountId, drafts)]);
  return detectTransfers(drafts, classifyDrafts(drafts, existing, openingDate), candidates);
}

export type PreviewResult = ({ ok: true; statuses: DraftStatus[]; openingDate: ISODate } & ImportInsights) | { ok: false; message: string };

async function householdCategories(supabase: Client, householdId: string) {
  const { data, error } = await supabase.from("categories").select("*").eq("household_id", householdId);
  if (error) throw error;
  return (data ?? []).map(mapCategory);
}

export async function previewImport(accountId: string, payload: unknown): Promise<PreviewResult> {
  const ctx = await getContext();
  const drafts = parseDrafts(payload);
  if (!drafts) return { ok: false, message: "Nessun movimento valido da controllare." };
  const supabase = await createClient();
  const account = await loadImportAccount(supabase, ctx.householdId, accountId);
  if (!account) return { ok: false, message: "Conto non trovato." };
  const today = todayISO();
  const [statuses, history, past, rules, categories] = await Promise.all([
    classify(supabase, ctx.householdId, account.id, account.openingDate, drafts),
    categorisedHistory(supabase, ctx.householdId),
    accountHistory(supabase, account.id, today),
    accountRules(supabase, account.id),
    householdCategories(supabase, ctx.householdId),
  ]);
  const insights = buildInsights({ drafts, statuses, history, accountHistory: past, rules, categories, today });
  return { ok: true, statuses, openingDate: account.openingDate, ...insights };
}

/**
 * Imports the drafts the user kept. Exact duplicates and movements covered by the opening balance are
 * dropped again here; possible duplicates are imported because the user chose them. Links to existing
 * movements become giroconti only when this server-side check confirms them.
 */
export async function importStatement(accountId: string, payload: unknown, metaInput: unknown, linksInput?: unknown, categoriesInput?: unknown): Promise<ActionState> {
  const ctx = await getContext();
  const drafts = parseDrafts(payload);
  if (!drafts) return failure("Nessun movimento valido da importare.");
  const meta = parseImportMeta(metaInput);
  const links = parseLinks(linksInput);
  const choices = parseCategoryChoices(categoriesInput);
  if (!meta || !links || !choices) return failure("Dati dell'import non validi.");
  const supabase = await createClient();
  const account = await loadImportAccount(supabase, ctx.householdId, accountId);
  if (!account) return failure("Conto non trovato.");

  const statuses = await classify(supabase, ctx.householdId, account.id, account.openingDate, drafts);
  const keep = drafts.filter((_, i) => statuses[i].kind === "new" || statuses[i].kind === "possible" || statuses[i].kind === "transfer");
  if (!keep.length) return failure("Tutti i movimenti scelti sono già presenti.");
  const transfers = confirmedLinks(links, drafts, statuses);

  const categories = await householdCategories(supabase, ctx.householdId);
  // Categories picked in the preview, kept only when valid for the row's direction of money.
  const categoryByLine = new Map<number, string | null>();
  for (const d of keep) if (choices.has(d.line)) categoryByLine.set(d.line, validCategory(choices.get(d.line), d.amountCents, categories));

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({ household_id: ctx.householdId, account_id: account.id, file_name: meta.fileName, bank: meta.bank, created_by: ctx.userId })
    .select("id")
    .single();
  if (batchError) return failure(dbErrorMessage(batchError));
  const rows = importRows(keep, { householdId: ctx.householdId, accountId: account.id, categories, categoryByLine, batchId: String(batch.id), transfers });
  // Rows keep the order of `keep`, so each import ref maps back to its draft's link.
  const candidateByRef = new Map<string, string>();
  rows.forEach((r, i) => {
    const link = transfers.get(keep[i].line);
    if (link) candidateByRef.set(r.import_ref, link.id);
  });

  const inserted: { importRef: string; accountId: string; groupId: string | null; amountCents: number; bookedOn: string }[] = [];
  let failed: string | null = null;
  for (let i = 0; i < rows.length; i += CHUNK) {
    // Import refs are unique: rows already imported are skipped instead of failing the batch.
    const { data, error } = await supabase
      .from("transactions")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "import_ref", ignoreDuplicates: true })
      .select("import_ref, transfer_group_id, amount_cents, booked_on");
    if (error) {
      failed = dbErrorMessage(error);
      break;
    }
    for (const r of data ?? [])
      inserted.push({ importRef: String(r.import_ref), accountId: account.id, groupId: (r.transfer_group_id as string | null) ?? null, amountCents: Number(r.amount_cents), bookedOn: String(r.booked_on) });
  }
  const linked = await linkTransferSides(
    supabase,
    inserted.filter((r): r is typeof r & { groupId: string } => r.groupId !== null),
    candidateByRef,
  );

  // The batch records what actually went in, so undoing it removes exactly those rows.
  const stats = batchStats(inserted);
  if (stats.rowCount) {
    await supabase
      .from("import_batches")
      .update({ row_count: stats.rowCount, total_cents: stats.totalCents, first_date: stats.firstDate, last_date: stats.lastDate })
      .eq("id", batch.id);
  } else await supabase.from("import_batches").update({ undone_at: new Date().toISOString() }).eq("id", batch.id);

  refresh();
  if (failed) return failure(stats.rowCount ? `Importati ${stats.rowCount} movimenti, poi: ${failed}` : failed);
  const imported = stats.rowCount === 1 ? "1 movimento importato" : `${stats.rowCount} movimenti importati`;
  return success(linked ? `${imported}, ${linked === 1 ? "1 collegato come giroconto" : `${linked} collegati come giroconti`}.` : `${imported}.`);
}

export async function undoImport(batchId: string): Promise<ActionState> {
  if (!isUUID(batchId)) return failure("Import non trovato.");
  await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("undo_import", { p_batch: batchId });
  if (error) return failure(/import not found/.test(error.message ?? "") ? "Import non trovato o già annullato." : dbErrorMessage(error));
  refresh();
  const n = Number(data ?? 0);
  return success(n === 1 ? "Import annullato: 1 movimento eliminato." : `Import annullato: ${n} movimenti eliminati.`);
}
