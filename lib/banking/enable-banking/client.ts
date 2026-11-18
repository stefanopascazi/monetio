// Minimal Enable Banking API client. Each call signs a fresh application JWT.
// `fetch` is injectable so tests never hit the network.
import { createAppJwt } from "./jwt.ts";
import type { Aspsp, AuthRequest, AuthResponse, BalanceResource, SessionResponse, TransactionResource, TransactionsResponse } from "./types.ts";

export const ENABLE_BANKING_API = "https://api.enablebanking.com";

export type EnableBankingConfig = {
  appId: string;
  privateKeyPem: string;
  baseUrl?: string;
  fetch?: typeof fetch;
};

export class EnableBankingError extends Error {
  // Plain fields, no parameter properties: scripts run under Node's strip-only TypeScript.
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Enable Banking: HTTP ${status}`);
    this.name = "EnableBankingError";
    this.status = status;
    this.body = body;
  }
}

export function createEnableBankingClient(config: EnableBankingConfig) {
  const baseUrl = config.baseUrl ?? ENABLE_BANKING_API;
  const doFetch = config.fetch ?? fetch;

  async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
    const token = createAppJwt({ appId: config.appId, privateKeyPem: config.privateKeyPem });
    const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const res = await doFetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) throw new EnableBankingError(res.status, await res.text());
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }
  const get = <T>(path: string) => call<T>("GET", path);

  return {
    /** Application record: also a cheap check that app id and key match. */
    getApplication: () => get<Record<string, unknown>>("/application"),
    /** Banks (ASPSPs) available to this app in a country, e.g. "IT". */
    listAspsps: async (country: string): Promise<Aspsp[]> =>
      (await get<{ aspsps: Aspsp[] }>(`/aspsps?country=${encodeURIComponent(country.toUpperCase())}`)).aspsps ?? [],
    /** Starts the bank's consent flow: the person is sent to `url` and comes back to the redirect URL with a code. */
    startAuth: (request: AuthRequest) => call<AuthResponse>("POST", "/auth", request),
    /** Exchanges the callback code for a session holding the authorised accounts. */
    createSession: (code: string) => call<SessionResponse>("POST", "/sessions", { code }),
    getBalances: async (accountUid: string): Promise<BalanceResource[]> =>
      (await get<{ balances: BalanceResource[] }>(`/accounts/${encodeURIComponent(accountUid)}/balances`)).balances ?? [],
    /** Booked transactions since a date, following continuation keys up to `maxPages`. */
    getTransactions: async (accountUid: string, dateFrom: string, maxPages = 20): Promise<TransactionResource[]> => {
      const all: TransactionResource[] = [];
      let key: string | null | undefined;
      for (let page = 0; page < maxPages; page++) {
        const params = new URLSearchParams({ date_from: dateFrom, transaction_status: "BOOK" });
        if (key) params.set("continuation_key", key);
        const res = await get<TransactionsResponse>(`/accounts/${encodeURIComponent(accountUid)}/transactions?${params}`);
        all.push(...(res.transactions ?? []));
        key = res.continuation_key;
        if (!key) break;
      }
      return all;
    },
    /** Unparsed GET, for diagnostics of what a bank really returns. */
    getRaw: (path: string) => get<Record<string, unknown>>(path),
    /** Revokes the consent at the bank. */
    deleteSession: (sessionId: string) => call<Record<string, unknown>>("DELETE", `/sessions/${encodeURIComponent(sessionId)}`),
  };
}

export type EnableBankingClient = ReturnType<typeof createEnableBankingClient>;
