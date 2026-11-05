import { Checker, isUUID, type ParseResult, text } from "./parse";

export interface ContributionInput {
  fromAccountId: string;
  toAccountId: string;
  description: string;
  fixedCents: number;
  sharePercent: number;
  categoryIds: string[];
  dayOfMonth: number;
  estimatedSpendingCents: number;
  active: boolean;
}

export function parseContributionForm(fd: FormData): ParseResult<ContributionInput> {
  const from = text(fd, "fromAccountId");
  const to = text(fd, "toAccountId");
  const fixed = Number(text(fd, "fixedCents") || "0");
  const share = Number(text(fd, "sharePercent") || "0");
  const day = Number(text(fd, "dayOfMonth"));
  const estimate = Number(text(fd, "estimatedSpendingCents") || "0");
  const categoryIds = fd.getAll("categoryIds").map(String).filter(Boolean);
  const description = text(fd, "description");

  return new Checker()
    .check(isUUID(from), "fromAccountId", "Scegli il conto che versa")
    .check(isUUID(to) && to !== from, "toAccountId", "Scegli un conto di destinazione diverso")
    .check(Number.isInteger(fixed) && fixed >= 0, "fixedCents", "Quota fissa non valida")
    .check(Number.isFinite(share) && share >= 0 && share <= 100, "sharePercent", "Percentuale tra 0 e 100")
    .check(share === 0 || categoryIds.length > 0, "categoryIds", "Scegli almeno una categoria da dividere")
    .check(categoryIds.every(isUUID), "categoryIds", "Categoria non valida")
    .check(Number.isInteger(day) && day >= 1 && day <= 31, "dayOfMonth", "Giorno tra 1 e 31")
    .check(Number.isInteger(estimate) && estimate >= 0, "estimatedSpendingCents", "Stima non valida")
    .check(description.length > 0, "description", "Scrivi una descrizione")
    .result({ fromAccountId: from, toAccountId: to, description, fixedCents: fixed, sharePercent: share, categoryIds, dayOfMonth: day, estimatedSpendingCents: estimate, active: text(fd, "active") !== "false" });
}
