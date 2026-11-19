import { LEGAL_OWNER, LEGAL_UPDATED_AT } from "./owner";
import type { LegalDocument } from "./types";

const { name, email, service } = LEGAL_OWNER;

export const PRIVACY_POLICY: LegalDocument = {
  title: "Informativa sulla privacy",
  intro: `Questa informativa spiega quali dati personali tratta ${service}, perché e con quali diritti per te, ai sensi del Regolamento UE 2016/679 (GDPR).`,
  updatedAt: LEGAL_UPDATED_AT,
  sections: [
    {
      title: "Titolare del trattamento",
      paragraphs: [`Il titolare del trattamento è ${name}. Per qualsiasi richiesta sulla privacy puoi scrivere a ${email}.`],
    },
    {
      title: "Che cos'è il servizio",
      paragraphs: [
        `${service} è un'applicazione privata per la gestione condivisa del bilancio familiare, accessibile solo su invito. Non è una banca, non offre servizi di pagamento e non fornisce consulenza finanziaria, creditizia, assicurativa o fiscale.`,
      ],
    },
    {
      title: "Dati trattati",
      paragraphs: ["Trattiamo solo i dati necessari al funzionamento del servizio:"],
      items: [
        "dati di account: nome, indirizzo email, credenziali di accesso (la password è conservata solo in forma cifrata);",
        "dati del nucleo familiare: membri, conti, categorie, regole ricorrenti, scadenze e impostazioni;",
        "movimenti e saldi inseriti a mano o importati da estratti conto;",
        "dati bancari ottenuti tramite il collegamento PSD2, se lo attivi (vedi sezione dedicata);",
        "domande poste all'assistente di pianificazione, se lo usi;",
        "dati tecnici: log di sicurezza, errori dell'applicazione, statistiche di utilizzo anonime e abbonamenti alle notifiche push.",
      ],
    },
    {
      title: "Collegamento bancario (PSD2)",
      paragraphs: [
        "Se scegli di collegare un conto, il servizio usa Enable Banking Oy, prestatore di servizi di informazione sui conti (AISP) autorizzato ai sensi della Direttiva UE 2015/2366 (PSD2). L'autenticazione avviene sempre sul sito o nell'app della tua banca: le credenziali bancarie non transitano mai da " +
          `${service}.`,
        "L'accesso è in sola lettura: vengono letti elenco dei conti, saldi e movimenti, al solo scopo di mostrarli nel tuo bilancio. Non è possibile disporre pagamenti. Il consenso ha una durata limitata (massimo 180 giorni), puoi revocarlo in qualsiasi momento dall'app o dalla tua banca e, alla revoca, la sincronizzazione si interrompe.",
      ],
    },
    {
      title: "Finalità e base giuridica",
      paragraphs: [],
      items: [
        "erogazione del servizio richiesto (art. 6.1.b GDPR, esecuzione del contratto): account, bilancio, sincronizzazione bancaria, notifiche;",
        "funzioni facoltative come l'assistente di pianificazione e il collegamento bancario: solo previa tua attivazione esplicita (art. 6.1.a GDPR, consenso revocabile);",
        "sicurezza e prevenzione di abusi, diagnosi degli errori (art. 6.1.f GDPR, legittimo interesse);",
        "adempimento di obblighi di legge (art. 6.1.c GDPR).",
      ],
    },
    {
      title: "Fornitori (responsabili del trattamento)",
      paragraphs: ["I dati sono trattati con l'aiuto di fornitori che agiscono su nostra istruzione e con adeguate garanzie contrattuali:"],
      items: [
        "Supabase: database e autenticazione;",
        "Vercel: hosting dell'applicazione e statistiche di utilizzo anonime;",
        "Enable Banking Oy: collegamento ai conti bancari via PSD2;",
        "Anthropic: modello di intelligenza artificiale dell'assistente, che riceve solo dati aggregati e pseudonimizzati e non li usa per l'addestramento;",
        "Sentry: monitoraggio degli errori.",
      ],
    },
    {
      title: "Trasferimenti extra UE",
      paragraphs: [
        "Alcuni fornitori possono trattare dati fuori dallo Spazio economico europeo. In tal caso il trasferimento avviene sulla base di una decisione di adeguatezza (EU-US Data Privacy Framework) o delle clausole contrattuali standard approvate dalla Commissione europea.",
      ],
    },
    {
      title: "Conservazione",
      paragraphs: [
        "I dati restano conservati finché il tuo account è attivo. Le conversazioni con l'assistente vengono cancellate dopo 30 giorni. Alla chiusura dell'account i dati vengono eliminati entro 30 giorni, salvo obblighi di legge.",
      ],
    },
    {
      title: "Cookie",
      paragraphs: [
        "Usiamo solo cookie tecnici indispensabili per mantenere la sessione di accesso e preferenze salvate nel browser (tema, visibilità dei saldi). Non usiamo cookie di profilazione né pubblicitari: per questo non è richiesto un banner di consenso.",
      ],
    },
    {
      title: "I tuoi diritti",
      paragraphs: [`Puoi esercitare in qualsiasi momento i diritti previsti dagli artt. 15-22 GDPR scrivendo a ${email}:`],
      items: [
        "accesso, rettifica e cancellazione dei dati;",
        "limitazione del trattamento e opposizione;",
        "portabilità dei dati;",
        "revoca del consenso, senza pregiudizio per i trattamenti già effettuati;",
        "reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
      ],
    },
    {
      title: "Modifiche",
      paragraphs: ["Eventuali modifiche a questa informativa saranno pubblicate su questa pagina, con la data di aggiornamento."],
    },
  ],
};
