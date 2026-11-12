"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { AmountInput, Button, FormPanel, Select, Switch } from "@monetio/ui";
import { saveNotificationPrefs } from "@/app/actions/notifications";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";
import { LOW_PREFIX } from "@/lib/forms/notification-prefs";
import { KIND_LABELS, NOTIFICATION_KINDS, type NotificationKind, type NotificationPrefs } from "@/lib/notifications/prefs";

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));
const DUE_DAYS = [0, 1, 2, 3, 5, 7].map((d) => ({ value: String(d), label: d === 0 ? "Il giorno stesso" : d === 1 ? "1 giorno prima" : `${d} giorni prima` }));
const STALE_DAYS = [7, 14, 21, 30, 60].map((d) => ({ value: String(d), label: `${d} giorni` }));

export interface ThresholdAccount {
  id: string;
  name: string;
}

/** What to be notified about, when push stays silent, and month-end thresholds per account. */
export function NotificationPrefsForm({ prefs, accounts }: { prefs: NotificationPrefs; accounts: ThresholdAccount[] }) {
  const { state, pending, onSubmit, error } = useFormAction(saveNotificationPrefs);
  const [muted, setMuted] = useState<NotificationKind[]>(prefs.pushMutedKinds);
  const [quiet, setQuiet] = useState(prefs.quietHours !== null);
  const [thresholds, setThresholds] = useState<Record<string, number | null>>(prefs.lowBalanceCents);

  const toggleKind = (kind: NotificationKind, on: boolean) => setMuted((m) => (on ? m.filter((k) => k !== kind) : [...m, kind]));

  return (
    <FormPanel
      title="Preferenze notifiche"
      icon={<SlidersHorizontal />}
      defaultOpen={false}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending}>
          Salva preferenze
        </Button>
      }
    >
      <FormMessage state={state} />
      <div className="mio-span-full flex flex-col gap-3">
        <p className="text-sm text-ink-muted">Le notifiche arrivano sempre nella campanella. Qui scegli quali ricevere anche come notifica push.</p>
        {NOTIFICATION_KINDS.map((kind) => (
          <Switch key={kind} label={KIND_LABELS[kind]} checked={!muted.includes(kind)} onCheckedChange={(on) => toggleKind(kind, on)} />
        ))}
        {muted.map((kind) => (
          <input key={kind} type="hidden" name="pushMuted" value={kind} />
        ))}
      </div>

      <Select name="dueDays" label="Avvisami delle scadenze" options={DUE_DAYS} defaultValue={String(prefs.dueDays)} error={error("dueDays")} />
      <Select name="staleDays" label="Conto da aggiornare dopo" options={STALE_DAYS} defaultValue={String(prefs.staleDays)} error={error("staleDays")} />

      <div className="mio-span-full flex flex-col gap-3">
        <Switch
          label="Orario silenzioso"
          description="In queste ore le notifiche push aspettano la fine dell'orario; nella campanella arrivano subito."
          checked={quiet}
          onCheckedChange={setQuiet}
        />
      </div>
      {quiet && (
        <>
          <Select name="quietStart" label="Dalle" options={HOURS} defaultValue={String(prefs.quietHours?.start ?? 22)} error={error("quietStart")} />
          <Select name="quietEnd" label="Alle" options={HOURS} defaultValue={String(prefs.quietHours?.end ?? 7)} error={error("quietEnd")} />
        </>
      )}

      {accounts.length > 0 && (
        <div className="mio-span-full flex flex-col gap-3">
          <p className="text-sm text-ink-muted">Rimanenza minima a fine mese: ti avvisiamo se la previsione scende sotto questa cifra. Vuoto = sotto zero.</p>
          {accounts.map((a) => (
            <div key={a.id}>
              <AmountInput
                label={a.name}
                valueCents={thresholds[a.id] ?? null}
                onValueChange={(cents) => setThresholds((t) => ({ ...t, [a.id]: cents }))}
                error={error(LOW_PREFIX + a.id)}
              />
              <input type="hidden" name={LOW_PREFIX + a.id} value={thresholds[a.id] ?? ""} />
            </div>
          ))}
        </div>
      )}
    </FormPanel>
  );
}
