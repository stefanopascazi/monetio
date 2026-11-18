"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, InlineConfirm } from "@monetio/ui";
import { deleteBankCredentials } from "@/app/actions/banking";
import { useToastAction } from "@/hooks/useToastAction";
import { type BankApp, ENVIRONMENT_LABEL, shortAppId } from "@/lib/banking/bank-app";
import { BankCredentialsForm } from "./BankCredentialsForm";

const dateFormat = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric" });

/** The person's saved application: what it is, replace it, remove it. */
export function BankAppCard({ app }: { app: BankApp }) {
  const [replacing, setReplacing] = useState(false);
  const { run } = useToastAction();
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={app.appName ?? "La tua app Enable Banking"}
        subtitle={`ID ${shortAppId(app.appId)} · verificata il ${dateFormat.format(new Date(app.verifiedAt))}`}
        action={<Badge tone={app.environment === "production" ? "success" : "info"}>{ENVIRONMENT_LABEL[app.environment]}</Badge>}
      >
        <p className="text-sm text-ink-muted">
          {app.environment === "sandbox"
            ? "App di prova: vedrai solo banche finte, utili per provare il collegamento."
            : "Il collegamento dei conti arriva nel prossimo aggiornamento."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!replacing && (
            <Button variant="secondary" iconStart={<RefreshCw />} onClick={() => setReplacing(true)}>
              Sostituisci
            </Button>
          )}
          <InlineConfirm
            triggerLabel="Rimuovi app"
            triggerIcon={<Trash2 />}
            message="La chiave verrà cancellata da MonetIO. Potrai caricarla di nuovo in seguito."
            confirmLabel="Rimuovi"
            onConfirm={() => run(deleteBankCredentials)}
          />
        </div>
      </Card>
      {replacing && <BankCredentialsForm replacing onDone={() => setReplacing(false)} />}
    </div>
  );
}
