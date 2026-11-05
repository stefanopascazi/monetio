// How the "Piano Risparmi" sheet maps onto MonetIO accounts, categories and transactions.

export type AccountKey = "joint" | "ste" | "asha" | "asha2";

export interface AccountSpec {
  key: AccountKey;
  name: string;
  type: "checking" | "savings" | "investment" | "cash";
  visibility: "shared" | "private";
  owner: "ste" | "asha" | null;
  /** Column holding the running balance. */
  balanceCol: string;
  sortOrder: number;
}

export interface ColumnSpec {
  col: string;
  account: AccountKey;
  category: string;
  /** Default description; cell comments override it. */
  label: string;
  /** Internal transfer when set (the other side is imported from its own column). */
  counterpart?: AccountKey;
}

export const ACCOUNTS: AccountSpec[] = [
  { key: "joint", name: "Conto cointestato", type: "checking", visibility: "shared", owner: null, balanceCol: "D", sortOrder: 0 },
  { key: "ste", name: "Conto Ste", type: "checking", visibility: "private", owner: "ste", balanceCol: "BT", sortOrder: 1 },
  { key: "asha", name: "Conto Asha", type: "checking", visibility: "private", owner: "asha", balanceCol: "BH", sortOrder: 2 },
  { key: "asha2", name: "Conto Asha 2", type: "checking", visibility: "private", owner: "asha", balanceCol: "AQ", sortOrder: 3 },
];

export interface CategorySpec {
  name: string;
  kind: "income" | "expense" | "both";
  icon: string;
  colorIndex: 1 | 2 | 3 | 4 | 5 | 6;
}

export const CATEGORIES: CategorySpec[] = [
  { name: "Stipendio", kind: "income", icon: "briefcase", colorIndex: 1 },
  { name: "Tredicesima e bonus", kind: "income", icon: "gift", colorIndex: 1 },
  { name: "Assegni e bonus", kind: "income", icon: "baby", colorIndex: 1 },
  { name: "Interessi", kind: "income", icon: "percent", colorIndex: 1 },
  { name: "Quote e giroconti", kind: "both", icon: "arrow-left-right", colorIndex: 3 },
  { name: "Mutuo", kind: "expense", icon: "home", colorIndex: 2 },
  { name: "Finanziamenti", kind: "expense", icon: "landmark", colorIndex: 2 },
  { name: "Spesa", kind: "expense", icon: "shopping-cart", colorIndex: 4 },
  { name: "Luce", kind: "expense", icon: "zap", colorIndex: 4 },
  { name: "Gas", kind: "expense", icon: "flame", colorIndex: 4 },
  { name: "Acqua", kind: "expense", icon: "droplet", colorIndex: 3 },
  { name: "Rifiuti", kind: "expense", icon: "trash-2", colorIndex: 5 },
  { name: "Telefono e internet", kind: "expense", icon: "smartphone", colorIndex: 5 },
  { name: "Abbonamenti", kind: "expense", icon: "tv", colorIndex: 5 },
  { name: "Commissioni bancarie", kind: "expense", icon: "receipt", colorIndex: 6 },
  { name: "Figli", kind: "expense", icon: "baby", colorIndex: 6 },
  { name: "Auto", kind: "expense", icon: "car", colorIndex: 3 },
  { name: "Salute", kind: "expense", icon: "heart-pulse", colorIndex: 2 },
  { name: "Risparmio e investimenti", kind: "both", icon: "trending-up", colorIndex: 1 },
  { name: "Spese varie", kind: "expense", icon: "shopping-bag", colorIndex: 5 },
  { name: "Extra", kind: "both", icon: "sparkles", colorIndex: 6 },
  { name: "Rettifiche", kind: "both", icon: "scale", colorIndex: 6 },
];

const c = (col: string, account: AccountKey, category: string, label: string, counterpart?: AccountKey): ColumnSpec => ({
  col,
  account,
  category,
  label,
  counterpart,
});

export const COLUMNS: ColumnSpec[] = [
  // Joint account (balance D = previous D + these columns).
  c("F", "joint", "Quote e giroconti", "Versamento da Ste", "ste"),
  c("G", "joint", "Quote e giroconti", "Versamento da Asha", "asha"),
  c("H", "joint", "Mutuo", "Rata mutuo"),
  c("I", "joint", "Finanziamenti", "Rata finanziamento"),
  c("J", "joint", "Finanziamenti", "Finanziamento Daniele e Isa per Stefano"),
  c("K", "joint", "Quote e giroconti", "Versamento per Giulia", "asha2"),
  c("L", "joint", "Extra", "Uscite / entrate extra"),
  c("M", "joint", "Extra", "Uscite / entrate extra"),
  c("N", "joint", "Extra", "Uscite / entrate extra"),
  c("O", "joint", "Extra", "Uscite / entrate extra"),
  c("P", "joint", "Extra", "Uscite / entrate extra"),
  c("Q", "joint", "Extra", "Uscite / entrate extra"),
  c("R", "joint", "Assegni e bonus", "Assegno unico"),
  c("S", "joint", "Figli", "Baby-sitter"),
  c("T", "joint", "Commissioni bancarie", "Commissioni banca"),
  c("U", "joint", "Abbonamenti", "Netflix"),
  c("V", "joint", "Telefono e internet", "WindTre"),
  c("W", "joint", "Rifiuti", "Rifiuti"),
  c("X", "joint", "Luce", "Luce"),
  c("Y", "joint", "Acqua", "Acqua"),
  c("Z", "joint", "Gas", "Gas"),
  c("AA", "joint", "Spesa", "Spesa"),
  // Asha's first account (balance AQ = previous AQ + AB:AO).
  c("AB", "asha2", "Stipendio", "Stipendio"),
  c("AC", "asha2", "Tredicesima e bonus", "Tredicesima e bonus"),
  c("AD", "asha2", "Assegni e bonus", "Assegni familiari e bonus nido"),
  c("AE", "asha2", "Quote e giroconti", "Quota conto cointestato", "joint"),
  c("AF", "asha2", "Auto", "Auto e assicurazioni"),
  c("AG", "asha2", "Quote e giroconti", "Versamento per Giulia", "joint"),
  c("AH", "asha2", "Spese varie", "Spese varie"),
  c("AI", "asha2", "Figli", "Asilo nido"),
  c("AJ", "asha2", "Assegni e bonus", "Bonus asilo"),
  c("AK", "asha2", "Figli", "Asilo"),
  c("AL", "asha2", "Spese varie", "Spese varie"),
  c("AM", "asha2", "Commissioni bancarie", "Commissioni bonifici"),
  c("AN", "asha2", "Quote e giroconti", "Giroconto verso Conto Asha", "asha"),
  c("AO", "asha2", "Quote e giroconti", "Quota spesa cointestato", "joint"),
  // Asha's main account (balance BH = previous BH + AR:BF).
  c("AR", "asha", "Stipendio", "Stipendio"),
  c("AS", "asha", "Tredicesima e bonus", "Tredicesima e bonus"),
  c("AT", "asha", "Spese varie", "Spese varie"),
  c("AU", "asha", "Quote e giroconti", "Giroconto da Conto Asha 2", "asha2"),
  c("AV", "asha", "Interessi", "Interessi"),
  c("AW", "asha", "Risparmio e investimenti", "Investimenti"),
  c("AX", "asha", "Quote e giroconti", "Quota conto cointestato", "joint"),
  c("AY", "asha", "Spese varie", "Varie"),
  c("AZ", "asha", "Spese varie", "Varie"),
  c("BA", "asha", "Spese varie", "Varie"),
  c("BB", "asha", "Telefono e internet", "Wind"),
  c("BC", "asha", "Spese varie", "Varie"),
  c("BD", "asha", "Salute", "Psicologa"),
  c("BE", "asha", "Spese varie", "Spese del mese"),
  c("BF", "asha", "Quote e giroconti", "Quota spesa cointestato", "joint"),
  // Ste's account (balance BT = previous BT + BJ:BS).
  c("BJ", "ste", "Stipendio", "Stipendio"),
  c("BK", "ste", "Quote e giroconti", "Quota conto cointestato", "joint"),
  c("BL", "ste", "Quote e giroconti", "Quota finanziamento", "joint"),
  c("BM", "ste", "Finanziamenti", "Finanziamento Ste"),
  c("BN", "ste", "Finanziamenti", "Altre rate"),
  c("BO", "ste", "Quote e giroconti", "Quota spesa cointestato", "joint"),
  c("BP", "ste", "Extra", "Extra cointestato"),
  c("BQ", "ste", "Spese varie", "Spese del mese"),
  c("BR", "ste", "Risparmio e investimenti", "Trade Republic"),
  c("BS", "ste", "Risparmio e investimenti", "Risparmio Giulia"),
];

export const SHEET_NAME = "Piano Risparmi";
export const YEAR_COL = "B";
export const MONTH_COL = "C";
export const FIRST_ROW = 3;
/** Rows filled with this colour hold real history; white rows are the old manual projections. */
export const HISTORY_FILL = "FFCCCCCC";
