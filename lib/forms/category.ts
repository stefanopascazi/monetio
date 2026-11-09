import type { Category } from "../domain/types";
import { Checker, type ParseResult, text } from "./parse";

export type CategoryInput = Pick<Category, "name" | "kind" | "icon" | "colorIndex">;

const KINDS: Category["kind"][] = ["income", "expense", "both"];

export function parseCategoryForm(fd: FormData): ParseResult<CategoryInput> {
  const name = text(fd, "name");
  const kind = (text(fd, "kind") || "expense") as Category["kind"];
  const colorIndex = Number(text(fd, "colorIndex") || "1") as Category["colorIndex"];
  return new Checker()
    .check(name.length > 0 && name.length <= 40, "name", "Nome obbligatorio")
    .check(KINDS.includes(kind), "kind", "Scegli per cosa si usa")
    .check(Number.isInteger(colorIndex) && colorIndex >= 1 && colorIndex <= 6, "colorIndex", "Colore non valido")
    .result({ name, kind, icon: text(fd, "icon") || null, colorIndex });
}
