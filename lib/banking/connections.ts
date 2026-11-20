// Bank consents as the UI shows them.

export type BankConnectionAccount = {
  id: string;
  name: string | null;
  ibanMasked: string | null;
  currency: string | null;
  accountId: string | null;
  /** Last balance reported by the bank (check only: MonetIO's balance is never overwritten). */
  bankBalanceCents: number | null;
  bankBalanceOn: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Null while the first-sync preview waits for the owner's confirmation. */
  syncConfirmedAt: string | null;
  syncFrom: string | null;
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
        last_synced_at?: string | null;
        last_error?: string | null;
        sync_confirmed_at?: string | null;
        sync_from?: string | null;
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
      lastSyncedAt: a.last_synced_at ?? null,
      lastError: a.last_error ?? null,
      syncConfirmedAt: a.sync_confirmed_at ?? null,
      syncFrom: a.sync_from ?? null,
    })),
  };
}

/** Whole days left on the consent (0 when past). */
export function consentDaysLeft(validUntil: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(validUntil) - now.getTime()) / 86_400_000));
}

/** Outcome of the bank redirect, read from /dati/banche?esito=… */
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
