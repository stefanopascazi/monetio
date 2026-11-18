"use client";

import { KeyRound } from "lucide-react";
import { useId, useState } from "react";
import { Button, Field, FormPanel, TextField } from "@monetio/ui";
import { saveBankCredentials } from "@/app/actions/banking";
import { FormMessage } from "@/components/common/FormMessage";
import { useFormAction } from "@/hooks/useFormAction";

/** Max .pem size read in the browser; an RSA key is well under 4 KB. */
const MAX_KEY_BYTES = 8_000;

/** FileReader rather than File.text(): works in every browser and in jsdom. */
function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Application ID + .pem upload. The key is read in the browser and sent only to the server action. */
export function BankCredentialsForm({ replacing = false, onDone }: { replacing?: boolean; onDone?: () => void }) {
  const fileId = useId();
  const [formKey, setFormKey] = useState(0);
  const [key, setKey] = useState<{ name: string; pem: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { state, pending, onSubmit, error } = useFormAction(saveBankCredentials, () => {
    setKey(null);
    setFormKey((k) => k + 1);
    onDone?.();
  });

  const readFile = async (file: File) => {
    setFileError(null);
    if (file.size > MAX_KEY_BYTES) {
      setKey(null);
      setFileError("Il file è troppo grande per essere una chiave .pem");
      return;
    }
    try {
      setKey({ name: file.name, pem: await readAsText(file) });
    } catch {
      setKey(null);
      setFileError("Non è stato possibile leggere il file");
    }
  };

  return (
    <FormPanel
      key={formKey}
      title={replacing ? "Sostituisci app o chiave" : "Carica la tua app"}
      description="Verifichiamo ID e chiave con Enable Banking prima di salvarli. La chiave viene cifrata."
      icon={<KeyRound />}
      defaultOpen={replacing}
      onSubmit={onSubmit}
      actions={
        <Button type="submit" loading={pending} disabled={!key}>
          Verifica e salva
        </Button>
      }
    >
      <FormMessage state={state} />
      <TextField name="appId" label="Application ID" autoComplete="off" spellCheck={false} error={error("appId")} required />
      <Field label="Chiave privata (.pem)" htmlFor={fileId} hint={key ? `Selezionata: ${key.name}` : "Il file scaricato alla registrazione dell'app"} error={fileError ?? error("privateKey")}>
        <input
          id={fileId}
          type="file"
          accept=".pem,application/x-pem-file,application/x-x509-ca-cert,text/plain"
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand-ink"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void readFile(f);
          }}
        />
      </Field>
      <input type="hidden" name="privateKey" value={key?.pem ?? ""} />
    </FormPanel>
  );
}
