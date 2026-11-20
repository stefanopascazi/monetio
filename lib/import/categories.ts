// Category of an imported line: the one named in the file, else the account's match for its description.
import type { Category } from "../domain/types.ts";

/** Category the user picked for a line, if valid for its direction of money; otherwise null. */
export function validCategory(categoryId: string | null | undefined, amountCents: number, categories: Category[]): string | null {
  if (!categoryId) return null;
  const kind = amountCents > 0 ? "income" : "expense";
  const c = categories.find((x) => x.id === categoryId);
  return c && !c.archived && (c.kind === kind || c.kind === "both") ? c.id : null;
}
