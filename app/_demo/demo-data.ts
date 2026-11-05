// Sample data for the design-system demo page. Not real user data.
import type { CashflowPoint, CategorySlice, HouseholdMember, ProjectionPoint } from "@monetio/ui";

export const members: HouseholdMember[] = [
  { id: "g", name: "Giulia Rossi" },
  { id: "m", name: "Marco Rossi" },
  { id: "s", name: "Sofia Rossi" },
];

export const cashflow: CashflowPoint[] = [
  { label: "Jun", incomeCents: 412000, expenseCents: 298000 },
  { label: "Jul", incomeCents: 415000, expenseCents: 362000 },
  { label: "Aug", incomeCents: 409000, expenseCents: 441000 },
  { label: "Sep", incomeCents: 418000, expenseCents: 305000 },
  { label: "Oct", incomeCents: 426000, expenseCents: 318000 },
  { label: "Nov", incomeCents: 431000, expenseCents: 214000 },
];

export const projection: ProjectionPoint[] = [
  { label: "Jun", valueCents: 4_102_000 },
  { label: "Jul", valueCents: 4_216_000 },
  { label: "Aug", valueCents: 4_184_000 },
  { label: "Sep", valueCents: 4_297_000 },
  { label: "Oct", valueCents: 4_405_000 },
  { label: "Nov", valueCents: 4_821_035 },
  { label: "Dec", valueCents: 4_930_000, projected: true, lowCents: 4_860_000, highCents: 5_010_000 },
  { label: "Jan", valueCents: 5_040_000, projected: true, lowCents: 4_910_000, highCents: 5_190_000 },
  { label: "Feb", valueCents: 5_160_000, projected: true, lowCents: 4_950_000, highCents: 5_380_000 },
  { label: "Mar", valueCents: 5_290_000, projected: true, lowCents: 5_000_000, highCents: 5_580_000 },
];

export const categories: CategorySlice[] = [
  { label: "Housing", valueCents: 95000 },
  { label: "Groceries", valueCents: 48200 },
  { label: "Transport", valueCents: 18400 },
  { label: "Dining out", valueCents: 15600 },
  { label: "Kids", valueCents: 12100 },
  { label: "Health", valueCents: 6300 },
  { label: "Gifts", valueCents: 3900 },
];
