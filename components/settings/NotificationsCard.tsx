"use client";

import { BellRing } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, Button, Card, Switch } from "@monetio/ui";
import { type PushStatus, usePushNotifications } from "@/hooks/usePushNotifications";

const BLOCKED_COPY: Partial<Record<PushStatus, { tone: "info" | "warning"; text: string }>> = {
  "ios-install": { tone: "info", text: "Su iPhone e iPad aggiungi MonetIO alla schermata Home (Condividi › Aggiungi alla schermata Home) e aprila da lì per attivare le notifiche." },
  dev: { tone: "info", text: "Le notifiche sono disponibili solo nella versione pubblicata dell'app." },
  unsupported: { tone: "warning", text: "Questo browser non supporta le notifiche push." },
  unconfigured: { tone: "warning", text: "Le notifiche non sono ancora configurate sul server." },
  denied: { tone: "warning", text: "Hai bloccato le notifiche per MonetIO. Riattivale dalle impostazioni del browser, poi torna qui." },
};

/** Per-device push notifications toggle with a test button (#28); preferences come as children. */
export function NotificationsCard({ children }: { children?: ReactNode }) {
  const { status, subscribed, pending, setEnabled, sendTest } = usePushNotifications();
  const blocked = status ? BLOCKED_COPY[status] : undefined;
  return (
    <Card title="Notifiche" subtitle="Push su questo dispositivo e preferenze" className="lg:col-span-2">
      <div className="flex flex-col gap-4">
        {blocked ? (
          <Alert tone={blocked.tone}>{blocked.text}</Alert>
        ) : (
          <Switch
            label="Notifiche su questo dispositivo"
            description="Il browser ti chiederà il permesso. Ogni dispositivo si attiva a parte."
            checked={subscribed}
            disabled={status === null || pending}
            onCheckedChange={setEnabled}
          />
        )}
        {status === "ready" && subscribed && (
          <div>
            <Button type="button" variant="secondary" iconStart={<BellRing />} onClick={sendTest} disabled={pending}>
              Invia notifica di prova
            </Button>
          </div>
        )}
        {children}
      </div>
    </Card>
  );
}
