import { Amount, Badge } from "@monetio/ui";
import { type BankConnectionAccount, bankBalanceView } from "@/lib/banking/connections";
import { nextSyncLabel, slotsForBudget } from "@/lib/banking/sync/slots";

const timeFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

type Props = { account: BankConnectionAccount; monetioBalanceCents: number | undefined; now?: Date };

/**
 * Current and available balance of a linked bank account, as banks show them, next to MonetIO's (check only),
 * with the last and next sync.
 */
export function BankAccountStatus({ account, monetioBalanceCents, now = new Date() }: Props) {
  const view = bankBalanceView(account, monetioBalanceCents);
  const slots = slotsForBudget(account.syncSlots);
  const fromBank = account.bankBalanceCents != null || account.bankAvailableCents != null;
  return (
    <div className="flex flex-col gap-2 text-xs text-ink-muted">
      {account.lastError && (
        <p role="alert" className="font-semibold text-danger">
          {account.lastError}
        </p>
      )}
      {fromBank && (
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
          {view.currentCents != null && (
            <>
              <dt>Credito attuale</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <Amount cents={view.currentCents} tone="neutral" size="sm" />
                {view.gapCents === 0 && (
                  <Badge tone="success" size="sm">
                    Allineato
                  </Badge>
                )}
              </dd>
            </>
          )}
          {view.availableCents != null && (
            <>
              <dt>Credito disponibile</dt>
              <dd>
                <Amount cents={view.availableCents} tone="neutral" size="sm" />
              </dd>
            </>
          )}
        </dl>
      )}
      {fromBank && view.pendingCents != null && view.pendingCents !== 0 && (
        <p>
          Movimenti da contabilizzare <Amount cents={view.pendingCents} tone="neutral" size="sm" showSign />: pagamenti con carta o operazioni in attesa.
          Entrano in MonetIO quando la banca li contabilizza.
        </p>
      )}
      {view.gapCents != null && view.gapCents !== 0 && monetioBalanceCents != null && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning" size="sm" className="whitespace-nowrap">
            Differenza <Amount cents={view.gapCents} tone="neutral" size="sm" showSign />
          </Badge>
          <span>
            MonetIO <Amount cents={monetioBalanceCents} tone="neutral" size="sm" />
          </span>
        </div>
      )}
      <span>
        {account.lastSyncedAt ? `Ultimo aggiornamento ${timeFormat.format(new Date(account.lastSyncedAt))} · ` : ""}
        Prossimo {nextSyncLabel(now, slots)}
      </span>
      {account.syncSlots != null && <span>La banca consente {slots.length === 1 ? "un aggiornamento" : `${slots.length} aggiornamenti`} al giorno.</span>}
    </div>
  );
}
