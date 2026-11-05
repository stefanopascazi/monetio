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
  spendingAccountId: string | null;
  spendingMonthOffset: 0 | -1;
  roundingCents: number;
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
  const spendingAccount = text(fd, "spendingAccountId");
  const offset = Number(text(fd, "spendingMonthOffset") || "0");
  const rounding = Number(text(fd, "roundingCents") || "1");

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
    .check(!spendingAccount || isUUID(spendingAccount), "spendingAccountId", "Conto non valido")
    .check(offset === 0 || offset === -1, "spendingMonthOffset", "Mese di riferimento non valido")
    .check([1, 100, 500, 1000].includes(rounding), "roundingCents", "Arrotondamento non valido")
    .result({ fromAccountId: from, toAccountId: to, description, fixedCents: fixed, sharePercent: share, categoryIds, dayOfMonth: day, estimatedSpendingCents: estimate, spendingAccountId: spendingAccount || null, spendingMonthOffset: offset === -1 ? -1 : 0, roundingCents: rounding, active: text(fd, "active") !== "false" });
}
