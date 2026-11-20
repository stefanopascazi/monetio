"use server";

import { refresh } from "next/cache";
import { applyCategoryChoice, removeAccountMatch } from "@/lib/data/category-matches";
import { getContext } from "@/lib/data/context";
import { listCategories } from "@/lib/data/queries";
import { isUUID } from "@/lib/forms/parse";
import { validCategory } from "@/lib/import/categories";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, failure, success } from "./state";

const moved = (n: number) => (n === 1 ? "1 movimento" : `${n} movimenti`);

/** Category for a group of identical uncategorised movements ("Da categorizzare"), remembered for the account. */
export async function assignGroupCategory(accountId: string, description: string, direction: number, categoryId: string): Promise<ActionState> {
  if (!isUUID(accountId) || !isUUID(categoryId) || typeof description !== "string" || !description.trim() || description.length > 500 || (direction !== 1 && direction !== -1)) {
    return failure("Valori non validi.");
  }
  const ctx = await getContext();
  const categories = await listCategories();
  if (!validCategory(categoryId, direction, categories)) return failure("Categoria non adatta a questi movimenti.");
  const supabase = await createClient();
  try {
    const count = await applyCategoryChoice(supabase, { householdId: ctx.householdId, accountId, description, amountCents: direction, categoryId });
    if (count === null) return failure("Questa descrizione non basta a riconoscere i movimenti.");
    refresh();
    return success(`Categoria assegnata a ${moved(count)}. I prossimi movimenti uguali la riceveranno da soli.`);
  } catch {
    return failure("Non sono riuscito ad assegnare la categoria. Riprova.");
  }
}

/** Forgets a match: movements keep their category, new ones arrive without it. */
export async function removeCategoryMatch(id: string): Promise<ActionState> {
  if (!isUUID(id)) return failure("Abbinamento non trovato.");
  await getContext();
  try {
    await removeAccountMatch(await createClient(), id);
  } catch {
    return failure("Non sono riuscito a rimuovere l'abbinamento. Riprova.");
  }
  refresh();
  return success("Abbinamento rimosso.");
}
