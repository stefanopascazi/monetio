// Subset of the Enable Banking API records used by MonetIO; other fields are ignored.

export type Aspsp = {
  name: string;
  country: string;
  bic?: string | null;
  logo?: string | null;
  /** "personal" and/or "business". */
  psu_types?: string[];
  /** Maximum consent validity, in seconds. */
  maximum_consent_validity?: number | null;
  beta?: boolean;
};

export type AuthRequest = {
  access: { valid_until: string };
  aspsp: { name: string; country: string };
  /** Opaque value echoed back on the redirect: binds the callback to the browser that started it. */
  state: string;
  redirect_url: string;
  psu_type: "personal" | "business";
  language?: string;
};

export type AuthResponse = { url: string; authorization_id?: string };

export type AccountResource = {
  uid: string;
  account_id?: { iban?: string | null; other?: unknown } | null;
  name?: string | null;
  details?: string | null;
  product?: string | null;
  currency?: string | null;
  cash_account_type?: string | null;
};

export type AmountType = { currency: string; amount: string };

export type BalanceResource = {
  name?: string | null;
  balance_amount: AmountType;
  /** ISO 20022 code, e.g. CLBD (closing booked), ITAV (interim available), XPCD (expected). */
  balance_type?: string | null;
  reference_date?: string | null;
};

type PartyAccount = { iban?: string | null } | null;

export type TransactionResource = {
  entry_reference?: string | null;
  transaction_id?: string | null;
  transaction_amount: AmountType;
  /** CRDT = money in, DBIT = money out. */
  credit_debit_indicator: "CRDT" | "DBIT";
  /** BOOK = booked, PDNG = pending. */
  status?: string | null;
  booking_date?: string | null;
  value_date?: string | null;
  transaction_date?: string | null;
  remittance_information?: string[] | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
  creditor_account?: PartyAccount;
  debtor_account?: PartyAccount;
  note?: string | null;
};

export type TransactionsResponse = { transactions: TransactionResource[]; continuation_key?: string | null };

export type SessionResponse = {
  session_id: string;
  accounts: AccountResource[];
  aspsp: { name: string; country: string };
  access?: { valid_until?: string | null } | null;
};
