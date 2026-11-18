// Server-side bank linking: opens the person's sealed key, talks to Enable Banking, stores consents.
// Dependencies are injected so the flow is unit-tested without network or database.
import { randomBytes } from "node:crypto";
import type { createEnableBankingClient, EnableBankingConfig } from "./enable-banking/client.ts";
import type { Aspsp } from "./enable-banking/types.ts";
import { buildAuthRequest, consentValidUntil, mapSessionAccounts, sessionValidUntil, type LinkedAccountRow } from "./link.ts";
import { openSecret, sealSecret } from "./secrets.ts";

type Client = Pick<ReturnType<typeof createEnableBankingClient>, "listAspsps" | "startAuth" | "createSession" | "deleteSession">;

export type CredentialsRecord = { app_id: string; private_key_sealed: string };

export type BankStore = {
  loadCredentials: (userId: string) => Promise<CredentialsRecord | null>;
  insertConnection: (
    row: { user_id: string; household_id: string; aspsp_name: string; aspsp_country: string; session_id_sealed: string; valid_until: string },
    accounts: LinkedAccountRow[],
  ) => Promise<void>;
  loadConnection: (id: string, userId: string) => Promise<{ id: string; session_id_sealed: string } | null>;
  deleteConnection: (id: string) => Promise<void>;
};

export type BankServiceDeps = {
  masterKey: Buffer;
  store: BankStore;
  createClient: (config: EnableBankingConfig) => Client;
  now?: () => Date;
};

export class BankSetupMissing extends Error {
  constructor() {
    super("Nessuna app Enable Banking salvata");
    this.name = "BankSetupMissing";
  }
}

export function createBankService({ masterKey, store, createClient, now = () => new Date() }: BankServiceDeps) {
  async function clientFor(userId: string): Promise<Client> {
    const creds = await store.loadCredentials(userId);
    if (!creds) throw new BankSetupMissing();
    return createClient({ appId: creds.app_id, privateKeyPem: openSecret(creds.private_key_sealed, masterKey, userId) });
  }

  return {
    listBanks: async (userId: string, country: string): Promise<Aspsp[]> => (await clientFor(userId)).listAspsps(country),

    /** Returns the bank URL to send the person to, and the state to keep in a cookie for the callback. */
    startLink: async (input: { userId: string; aspspName: string; country: string; redirectUrl: string }) => {
      const client = await clientFor(input.userId);
      const banks = await client.listAspsps(input.country);
      const bank = banks.find((b) => b.name === input.aspspName);
      if (!bank) return { ok: false as const, message: "Banca non disponibile per la tua app." };
      const state = randomBytes(24).toString("base64url");
      const validUntil = consentValidUntil(now(), bank.maximum_consent_validity);
      const { url } = await client.startAuth(buildAuthRequest({ aspspName: bank.name, country: bank.country, state, redirectUrl: input.redirectUrl, validUntil }));
      return { ok: true as const, url, state };
    },

    /** Exchanges the callback code and stores the consent with its accounts. Returns how many accounts came back. */
    completeLink: async (input: { userId: string; householdId: string; code: string }) => {
      const client = await clientFor(input.userId);
      const session = await client.createSession(input.code);
      const accounts = mapSessionAccounts(session);
      await store.insertConnection(
        {
          user_id: input.userId,
          household_id: input.householdId,
          aspsp_name: session.aspsp.name.slice(0, 120),
          aspsp_country: session.aspsp.country.toUpperCase(),
          session_id_sealed: sealSecret(session.session_id, masterKey, input.userId),
          valid_until: sessionValidUntil(session, consentValidUntil(now(), null)),
        },
        accounts,
      );
      return accounts.length;
    },

    /** Revokes the consent at the bank (best effort) and forgets it. False when not the caller's. */
    removeLink: async (input: { userId: string; connectionId: string }) => {
      const conn = await store.loadConnection(input.connectionId, input.userId);
      if (!conn) return false;
      try {
        const client = await clientFor(input.userId);
        await client.deleteSession(openSecret(conn.session_id_sealed, masterKey, input.userId));
      } catch (error) {
        // An expired or already revoked session must not block removal from MonetIO.
        console.warn("[banking] session revoke failed", error instanceof Error ? error.name : "unknown");
      }
      await store.deleteConnection(conn.id);
      return true;
    },
  };
}

export type BankService = ReturnType<typeof createBankService>;
