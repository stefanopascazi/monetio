import { createEnableBankingClient, EnableBankingError, type EnableBankingConfig } from "../../../../lib/banking/enable-banking/client.ts";
import { openSecret } from "../../../../lib/banking/secrets.ts";
import { type SyncClient, syncBankAccount } from "../../../../lib/banking/sync/run.ts";
import { BANK_SYNC_HOURS, BANK_SYNC_TIME_ZONE } from "../../../../lib/banking/sync/slots.ts";
import type { BankSyncStore } from "../bank/store.ts";
import { errorMessage } from "../logger.ts";
import { isSchemaNotReady } from "../schema.ts";
import { slotsDue } from "./schedule.ts";
import type { Job } from "./types.ts";

export { BANK_SYNC_HOURS, BANK_SYNC_TIME_ZONE };

export type BankSyncDeps = {
  store: BankSyncStore;
  masterKey: Buffer;
  createClient?: (config: EnableBankingConfig) => SyncClient;
};

/** Message stored on the bank account and shown to its owner. */
export function syncErrorMessage(error: unknown): string {
  if (error instanceof EnableBankingError && (error.status === 401 || error.status === 403)) return "Consenso non più valido: collega di nuovo la banca.";
  if (error instanceof EnableBankingError && error.status === 429) return "Limite di letture della banca raggiunto: riprovo al prossimo giro.";
  if (error instanceof Error && /decrypt|auth/i.test(error.message)) return "Chiave dell'app non leggibile: caricala di nuovo in Banche collegate.";
  return "Banca non raggiungibile: riprovo al prossimo giro.";
}

/** Reads balances and booked movements of every linked bank account and writes them to MonetIO. */
export function createBankSyncJob({ store, masterKey, createClient = createEnableBankingClient }: BankSyncDeps): Job {
  return {
    name: "bank-sync",
    intervalMs: 10 * 60_000,
    timeoutMs: 20 * 60_000,
    isDue: slotsDue(BANK_SYNC_HOURS, BANK_SYNC_TIME_ZONE),
    async run(ctx) {
      const expired = await store.expireConnections(ctx.now);
      const targets = await store.listTargets();
      const clients = new Map<string, SyncClient>();
      const totals = { inserted: 0, reconciled: 0, review: 0, skipped: 0, failed: 0 };

      for (const t of targets) {
        ctx.signal.throwIfAborted();
        try {
          let client = clients.get(t.userId);
          if (!client) {
            client = createClient({ appId: t.appId, privateKeyPem: openSecret(t.privateKeySealed, masterKey, t.userId) });
            clients.set(t.userId, client);
          }
          const counts = await syncBankAccount(t, client, store, ctx.now);
          ctx.log("info", "bank account synced", { bankAccount: t.bankAccountId, ...counts });
          for (const k of ["inserted", "reconciled", "review", "skipped"] as const) totals[k] += counts[k];
        } catch (error) {
          if (isSchemaNotReady(error)) throw error;
          // One bank failing must not stop the others; its owner sees the message on the page.
          totals.failed++;
          ctx.log("error", "bank account sync failed", { bankAccount: t.bankAccountId, error: errorMessage(error) });
          await store.saveStatus(t.bankAccountId, { syncedAt: ctx.now, balance: null, error: syncErrorMessage(error) });
        }
      }
      ctx.log("info", "bank sync done", { accounts: targets.length, expired, ...totals });
    },
  };
}
