import { LEGAL_OWNER, LEGAL_UPDATED_AT } from "./owner";
import type { LegalDocument } from "./types";

const { name, email, service } = LEGAL_OWNER;

export const TERMS_OF_USE: LegalDocument = {
  title: "Termini del servizio",
  intro: `Questi termini regolano l'uso di ${service}. Usando il servizio li accetti.`,
  updatedAt: LEGAL_UPDATED_AT,
  sections: [
    {
      title: "Fornitore",
      paragraphs: [`Il servizio è fornito da ${name}. Contatto: ${email}.`],
    },
    {
      title: "Il servizio",
      paragraphs: [
        `${service} è un'applicazione per la gestione condivisa del bilancio familiare: registrazione di movimenti, scadenze, analisi e proiezioni del saldo. L'accesso è gratuito e riservato alle persone invitate da un membro del nucleo.`,
      ],
    },
    {
      title: "Account",
      paragraphs: [
        "Sei responsabile della riservatezza delle tue credenziali e delle attività svolte con il tuo account. Segnalaci subito ogni accesso non autorizzato.",
      ],
    },
    {
      title: "Collegamento bancario",
      paragraphs: [
        "Il collegamento ai conti è facoltativo e avviene tramite Enable Banking Oy, prestatore autorizzato di servizi di informazione sui conti (PSD2). L'accesso è in sola lettura: il servizio non può disporre pagamenti né spostare denaro.",
        "I dati mostrati dipendono da quanto fornito dalla banca e possono contenere ritardi o imprecisioni. Puoi revocare il consenso in qualsiasi momento.",
      ],
    },
    {
      title: "Nessuna consulenza",
      paragraphs: [
        "Analisi, proiezioni e risposte dell'assistente sono indicazioni di pianificazione basate sui tuoi dati. Non costituiscono consulenza finanziaria, creditizia, assicurativa o fiscale. Per decisioni di questo tipo rivolgiti a un professionista abilitato.",
      ],
    },
    {
      title: "Uso consentito",
      paragraphs: ["Ti impegni a non:"],
      items: [
        "usare il servizio per attività illecite o per trattare dati di terzi senza titolo;",
        "tentare di accedere a dati di altri nuclei o di aggirare le misure di sicurezza;",
        "sovraccaricare il servizio con richieste automatizzate.",
      ],
    },
    {
      title: "Disponibilità e responsabilità",
      paragraphs: [
        "Il servizio è fornito \"così com'è\", senza garanzia di disponibilità continua. Nei limiti consentiti dalla legge, il fornitore non risponde di danni indiretti derivanti dall'uso del servizio o da decisioni prese sulla base dei dati mostrati. Restano salvi i diritti inderogabili del consumatore.",
      ],
    },
    {
      title: "Dati personali",
      paragraphs: ["Il trattamento dei dati personali è descritto nell'informativa sulla privacy, disponibile alla pagina /privacy."],
    },
    {
      title: "Recesso e chiusura",
      paragraphs: [
        `Puoi smettere di usare il servizio e chiedere la cancellazione dell'account in qualsiasi momento scrivendo a ${email}. Il fornitore può sospendere gli account che violano questi termini.`,
      ],
    },
    {
      title: "Modifiche e legge applicabile",
      paragraphs: [
        "I termini possono essere aggiornati: le modifiche saranno pubblicate su questa pagina con la data di aggiornamento. Si applica la legge italiana; per i consumatori è competente il foro del luogo di residenza.",
      ],
    },
  ],
};
