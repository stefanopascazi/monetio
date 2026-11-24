import { createEnableBankingClient, EnableBankingError, type EnableBankingConfig } from "../../../../lib/banking/enable-banking/client.ts";
import { openSecret } from "../../../../lib/banking/secrets.ts";
import { type SyncClient, syncBankAccount } from "../../../../lib/banking/sync/run.ts";
import { BANK_SYNC_HOURS, BANK_SYNC_TIME_ZONE, currentSyncSlot, slotsForBudget } from "../../../../lib/banking/sync/slots.ts";
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

/**
 * Daily slots to keep after the bank refused a read with 429 at `slot`: the syncs already done today.
 * Null when nothing was done yet (the limit is not a daily budget, so it stays an error).
 */
export function learnedSyncSlots(syncSlots: number | null, slot: number): number | null {
  const done = slotsForBudget(syncSlots).filter((h) => h < slot).length;
  return done > 0 ? done : null;
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
      const slot = currentSyncSlot(ctx.now);
      // Accounts whose bank allows fewer daily reads only sync in their own slots.
      const targets = (await store.listTargets()).filter((t) => slotsForBudget(t.syncSlots).includes(slot));
      const clients = new Map<string, SyncClient>();
      const totals = { inserted: 0, reconciled: 0, review: 0, skipped: 0, failed: 0, limited: 0 };

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
          const learned = error instanceof EnableBankingError && error.status === 429 ? learnedSyncSlots(t.syncSlots, slot) : null;
          if (learned) {
            // Expected daily limit, not a failure: sync fewer times from now on.
            totals.limited++;
            ctx.log("warn", "bank read limit learned", { bankAccount: t.bankAccountId, slot, syncSlots: learned });
            await store.limitSyncSlots(t.bankAccountId, learned);
            continue;
          }
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
