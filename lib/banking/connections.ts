// Bank consents as the UI shows them.
import type { AccountPending, PendingItem } from "../domain/pending";

export type BankConnectionAccount = {
  id: string;
  name: string | null;
  ibanMasked: string | null;
  currency: string | null;
  accountId: string | null;
  /** Last balance reported by the bank (check only: MonetIO's balance is never overwritten). */
  bankBalanceCents: number | null;
  bankBalanceOn: string | null;
  /** Spendable balance: also counts card payments the bank has not booked yet. */
  bankAvailableCents: number | null;
  /** Movements the bank lists as not booked yet; null before the first sync that read them. */
  pendingMovements: PendingItem[] | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Null while the first-sync preview waits for the owner's confirmation. */
  syncConfirmedAt: string | null;
  syncFrom: string | null;
  /** Daily syncs the bank allows when fewer than the default slots (#112); null = all. */
  syncSlots: number | null;
};

export type BankConnection = {
  id: string;
  bankName: string;
  validUntil: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  lastSyncedAt: string | null;
  accounts: BankConnectionAccount[];
};

type Row = {
  id: string;
  aspsp_name: string;
  valid_until: string;
  status: string;
  created_at: string;
  last_synced_at: string | null;
  bank_accounts:
    | {
        id: string;
        name: string | null;
        iban_masked: string | null;
        currency: string | null;
        account_id: string | null;
        bank_balance_cents?: number | string | null;
        bank_balance_on?: string | null;
        bank_available_cents?: number | string | null;
        pending_movements?: PendingItem[] | null;
        last_synced_at?: string | null;
        last_error?: string | null;
        sync_confirmed_at?: string | null;
        sync_from?: string | null;
        sync_slots?: number | string | null;
      }[]
    | null;
};

export function mapBankConnection(row: Row): BankConnection {
  const status = row.status === "expired" || row.status === "revoked" ? row.status : "active";
  return {
    id: row.id,
    bankName: row.aspsp_name,
    validUntil: row.valid_until,
    status,
    createdAt: row.created_at,
    lastSyncedAt: row.last_synced_at,
    accounts: (row.bank_accounts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      ibanMasked: a.iban_masked,
      currency: a.currency,
      accountId: a.account_id,
      bankBalanceCents: a.bank_balance_cents == null ? null : Number(a.bank_balance_cents),
      bankBalanceOn: a.bank_balance_on ?? null,
      bankAvailableCents: a.bank_available_cents == null ? null : Number(a.bank_available_cents),
      pendingMovements: Array.isArray(a.pending_movements) ? a.pending_movements : null,
      lastSyncedAt: a.last_synced_at ?? null,
      lastError: a.last_error ?? null,
      syncConfirmedAt: a.sync_confirmed_at ?? null,
      syncFrom: a.sync_from ?? null,
      syncSlots: a.sync_slots == null ? null : Number(a.sync_slots),
    })),
  };
}

/** Whole days left on the consent (0 when past). */
export function consentDaysLeft(validUntil: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(validUntil) - now.getTime()) / 86_400_000));
}

/** Outcome of the bank redirect, read from /dati/banche?esito=… */
/** Consent revoked, expired, or past its end date. */
export function isConsentExpired(c: Pick<BankConnection, "status" | "validUntil">, now: Date = new Date()): boolean {
  return c.status !== "active" || consentDaysLeft(c.validUntil, now) === 0;
}

export const LINK_OUTCOME_MESSAGE: Record<string, { tone: "success" | "danger" | "warning"; text: string }> = {
  collegata: { tone: "success", text: "Banca collegata. I conti autorizzati sono qui sotto." },
  negata: { tone: "warning", text: "Collegamento annullato: la banca non ha ricevuto il consenso." },
  scaduta: { tone: "danger", text: "Il collegamento è scaduto o è stato avviato da un altro browser. Riprova da qui." },
  "nessun-conto": {
    tone: "warning",
    text: "La banca ha dato il consenso ma non ha condiviso nessun conto. Aggiungi prima il conto in \"Linked accounts\" della tua app sul Control Panel di Enable Banking, poi ricollegalo da qui.",
  },
  errore: { tone: "danger", text: "Non è stato possibile completare il collegamento. Riprova tra qualche minuto." },
};

/** Linked to a MonetIO account but the first import is not confirmed yet. */
export function awaitsPreview(account: Pick<BankConnectionAccount, "accountId" | "syncConfirmedAt">): boolean {
  return !!account.accountId && !account.syncConfirmedAt;
}

/** Bank balance minus MonetIO balance; null when either is unknown. Zero means aligned. */
export function balanceGap(bankCents: number | null, monetioCents: number | null | undefined): number | null {
  return bankCents == null || monetioCents == null ? null : bankCents - monetioCents;
}

export type BankBalanceView = {
  /** Booked balance from the bank or, when it offers none, MonetIO's (booked movements only). */
  currentCents: number | null;
  availableCents: number | null;
  /** Available minus current: card payments and holds not booked yet; null or 0 when none. */
  pendingCents: number | null;
  /** Bank booked balance minus MonetIO's: a real mismatch; null when the bank offers no booked balance. */
  gapCents: number | null;
};

/** Current and available balance as banks show them, with what explains their difference. */
export function bankBalanceView(
  account: Pick<BankConnectionAccount, "bankBalanceCents" | "bankAvailableCents">,
  monetioCents: number | null | undefined,
): BankBalanceView {
  const currentCents = account.bankBalanceCents ?? monetioCents ?? null;
  const availableCents = account.bankAvailableCents;
  return {
    currentCents,
    availableCents,
    pendingCents: currentCents == null || availableCents == null ? null : availableCents - currentCents,
    gapCents: balanceGap(account.bankBalanceCents, monetioCents),
  };
}

/** Bank accounts feeding a MonetIO account, with the consent they belong to. */
export function bankAccountsFor(connections: BankConnection[], accountId: string): { connection: BankConnection; account: BankConnectionAccount }[] {
  return connections.flatMap((connection) => connection.accounts.filter((a) => a.accountId === accountId).map((account) => ({ connection, account })));
}

export type AccountBankBalances = { currentCents: number; availableCents: number };

/**
 * Booked and available balance by MonetIO account, only where a live consent gives an available one.
 * `monetio` (balances by account) stands in for the booked balance when the bank offers none.
 */
export function bankBalancesByAccount(connections: BankConnection[], monetio: Record<string, number>, now: Date = new Date()): Record<string, AccountBankBalances> {
  const out: Record<string, AccountBankBalances> = {};
  for (const c of connections) {
    if (isConsentExpired(c, now)) continue;
    for (const a of c.accounts) {
      if (!a.accountId || !a.syncConfirmedAt || out[a.accountId]) continue;
      const view = bankBalanceView(a, monetio[a.accountId]);
      if (view.currentCents != null && view.availableCents != null) out[a.accountId] = { currentCents: view.currentCents, availableCents: view.availableCents };
    }
  }
  return out;
}

export type ProjectionPending = {
  /** What each account's pending money covers, for the projection (see settlePending). */
  pending: Record<string, AccountPending>;
  /** Available minus booked balance by account: lowers the projection start (see withPendingStart). */
  startCents: Record<string, number>;
};

/**
 * Pending money of the linked accounts for the projection, only where the available balance is below
 * the booked one. Listed items carry the category `categorize` gives them (the account's matches).
 */
export function projectionPending(
  connections: BankConnection[],
  monetio: Record<string, number>,
  categorize: (accountId: string, item: PendingItem) => string | null,
  now: Date = new Date(),
): ProjectionPending {
  const pending: Record<string, AccountPending> = {};
  const startCents: Record<string, number> = {};
  for (const c of connections) {
    if (isConsentExpired(c, now)) continue;
    for (const a of c.accounts) {
      if (!a.accountId || !a.syncConfirmedAt || a.accountId in pending || !(a.accountId in monetio)) continue;
      const total = bankBalanceView(a, monetio[a.accountId]).pendingCents;
      if (total == null || total >= 0) continue;
      const items = a.pendingMovements ?? [];
      const accountId = a.accountId;
      pending[accountId] = items.length ? { items: items.map((i) => ({ amountCents: i.amountCents, categoryId: categorize(accountId, i) })) } : { totalCents: total };
      startCents[accountId] = total;
    }
  }
  return { pending, startCents };
}
