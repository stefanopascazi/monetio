// Minimal Enable Banking API client. Each call signs a fresh application JWT.
// `fetch` is injectable so tests never hit the network.
import { createAppJwt } from "./jwt.ts";
import type { Aspsp } from "./types.ts";

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

  async function get<T>(path: string): Promise<T> {
    const token = createAppJwt({ appId: config.appId, privateKeyPem: config.privateKeyPem });
    const res = await doFetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!res.ok) throw new EnableBankingError(res.status, await res.text());
    return (await res.json()) as T;
  }

  return {
    /** Application record: also a cheap check that app id and key match. */
    getApplication: () => get<Record<string, unknown>>("/application"),
    /** Banks (ASPSPs) available to this app in a country, e.g. "IT". */
    listAspsps: async (country: string): Promise<Aspsp[]> =>
      (await get<{ aspsps: Aspsp[] }>(`/aspsps?country=${encodeURIComponent(country.toUpperCase())}`)).aspsps ?? [],
  };
}

export type EnableBankingClient = ReturnType<typeof createEnableBankingClient>;
