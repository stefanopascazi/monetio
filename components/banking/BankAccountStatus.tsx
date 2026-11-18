import { Amount, Badge } from "@monetio/ui";
import { balanceGap, type BankConnectionAccount } from "@/lib/banking/connections";

const timeFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Last sync of a linked bank account and its balance next to MonetIO's (check only). */
export function BankAccountStatus({ account, monetioBalanceCents }: { account: BankConnectionAccount; monetioBalanceCents: number | undefined }) {
  const gap = balanceGap(account.bankBalanceCents, monetioBalanceCents);
  return (
    <div className="flex flex-col gap-2 text-xs text-ink-muted">
      {account.lastError && (
        <p role="alert" className="font-semibold text-danger">
          {account.lastError}
        </p>
      )}
      {account.bankBalanceCents != null && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Saldo banca <Amount cents={account.bankBalanceCents} tone="neutral" size="sm" />
          </span>
          {monetioBalanceCents != null && (
            <span>
              MonetIO <Amount cents={monetioBalanceCents} tone="neutral" size="sm" />
            </span>
          )}
          {gap === 0 && (
            <Badge tone="success" size="sm">
              Allineato
            </Badge>
          )}
          {gap != null && gap !== 0 && (
            <Badge tone="warning" size="sm">
              Differenza <Amount cents={gap} tone="neutral" size="sm" showSign />
            </Badge>
          )}
        </div>
      )}
      <span>
        {account.lastSyncedAt
          ? `Ultimo aggiornamento ${timeFormat.format(new Date(account.lastSyncedAt))}`
          : "Non ancora aggiornato: il primo giro arriva entro qualche ora."}
      </span>
    </div>
  );
}
