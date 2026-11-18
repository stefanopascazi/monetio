import { Card } from "@monetio/ui";

const CONTROL_PANEL_URL = "https://enablebanking.com/cp";

/** Step-by-step guide to register one's own Enable Banking application. */
export function BankSetupGuide({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Card
      title="Come collegare le tue banche"
      subtitle="MonetIO legge i conti tramite Enable Banking, autorizzato come AISP. Ognuno registra la propria app: il piano gratuito vale solo per i conti personali di chi la registra."
    >
      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
        <li>
          Crea un account sul{" "}
          <a href={CONTROL_PANEL_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-ink underline">
            Control Panel di Enable Banking
          </a>
          .
        </li>
        <li>
          Apri <strong>Add a new application</strong> e scegli <strong>Production</strong> per le tue banche, oppure <strong>Sandbox</strong> per fare una prova con banche finte.
        </li>
        <li>
          Lascia <strong>Generate in the browser</strong>: alla registrazione scarichi la chiave privata (file .pem). Conservala in un posto sicuro, per esempio nel password manager, e non condividerla.
        </li>
        <li>
          Compila i campi: nome a piacere (es. &quot;MonetIO di Anna&quot;) e in <strong>Allowed redirect URLs</strong> incolla:
          <code className="mt-1 block break-all rounded-[10px] bg-surface-sunken px-3 py-2 font-mono text-xs select-all">{callbackUrl}</code>
          Email, privacy e termini puoi lasciarli vuoti.
        </li>
        <li>
          Solo per Production: collega i tuoi conti dal Control Panel (<strong>Activate by linking accounts</strong>). Puoi collegare solo conti tuoi o cointestati.
        </li>
        <li>Copia l&apos;Application ID e caricalo qui sotto insieme al file .pem.</li>
      </ol>
    </Card>
  );
}
