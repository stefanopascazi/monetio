# Assistente IA (premium) - progetto e perimetro

Stato: fase 1 in corso (motore what-if in `lib/domain/scenario.ts`). Data: 2026-11-13.

Funzionalità premium: un assistente che analizza i movimenti del nucleo e risponde a domande di pianificazione
("Possiamo permetterci una vacanza di 3000 € ad agosto 2027?") con un verdetto e un percorso per raggiungere l'obiettivo.

> Questo documento non è un parere legale. Prima del lancio pubblico il perimetro va validato da un professionista
> (avvocato esperto di regolamentazione finanziaria e privacy).

## 1. Perimetro legale (VINCOLANTE)

L'assistente fa **pianificazione di budget familiare** sui dati che l'utente ha inserito. Niente di più.
Ogni nuova funzionalità IA va verificata contro questa sezione. In caso di dubbio: fuori perimetro.

### Consentito

- Analisi di entrate, uscite, categorie, stagionalità e scadenze del nucleo.
- Proiezioni e simulazioni "what-if" sul saldo (spesa una tantum, tagli di categoria, accantonamenti, spostamento di date).
- Verdetto di fattibilità di un obiettivo di spesa o risparmio (sì / no / sì con condizioni).
- Percorsi di risparmio basati su leve interne al bilancio: ridurre una categoria, accantonare X €/mese, rimandare una spesa.
- Creazione di regole ricorrenti in MonetIO (es. "Accantonamento vacanza"), solo dopo conferma esplicita dell'utente.
- Informazioni generiche e didattiche (es. cos'è un fondo di emergenza), senza riferimenti a prodotti specifici.

### Vietato

| Ambito | Esempi vietati | Motivo |
| --- | --- | --- |
| Investimenti | Consigliare azioni, ETF, fondi, crypto, BTP, conti deposito specifici; dire "investi X in Y"; asset allocation personalizzata | Consulenza in materia di investimenti: attività riservata (TUF art. 18, MiFID II, vigilanza Consob/OCF) |
| Credito | Consigliare un prestito, un mutuo, un finanziamento o una carta revolving specifici; confrontare offerte di credito; "chiedi un prestito per la vacanza" | Intermediazione e mediazione creditizia riservate (TUB artt. 106 e 128-sexies, Banca d'Italia/OAM) |
| Merito creditizio | Calcolare score di affidabilità, valutare se l'utente "merita" credito, condividere valutazioni con terzi | Sistema IA ad alto rischio (AI Act, Reg. UE 2024/1689, Allegato III punto 5.b) |
| Assicurazioni | Consigliare polizze o compagnie specifiche | Distribuzione assicurativa riservata (Codice delle Assicurazioni Private, IVASS) |
| Fisco | Consulenza fiscale personalizzata, strategie di ottimizzazione fiscale, compilazione di dichiarazioni | Responsabilità professionale; rischio di indicazioni errate con conseguenze per l'utente |
| Previdenza | Consigliare fondi pensione specifici o quanto versarci | Ricade nella consulenza su prodotti finanziari/previdenziali (COVIP) |
| Affiliazioni | Link, referral o prodotti sponsorizzati di banche, broker, finanziarie | Conflitto di interessi; trasformerebbe il suggerimento in collocamento/promozione |
| Decisioni automatiche | Azioni sui dati senza conferma (creare/modificare regole, movimenti) | GDPR art. 22 e principio di controllo dell'utente |

### Regole di comportamento dell'assistente

- Usa solo leve interne al bilancio del nucleo. Se l'obiettivo è irraggiungibile, lo dice e propone di ridurlo
  o rimandarlo; **non** suggerisce mai credito o investimenti per colmare il gap.
- Se l'utente chiede consigli su prodotti finanziari, credito, assicurazioni o fisco: rifiuta con cortesia e
  rimanda a un professionista abilitato (consulente finanziario iscritto all'albo OCF, commercialista, ecc.).
- Non nomina banche, emittenti, broker o prodotti commerciali.
- Ogni risposta mostra il disclaimer: "Pianificazione indicativa basata sui tuoi dati. Non è consulenza finanziaria, creditizia, assicurativa o fiscale."
- I numeri mostrati provengono dal motore deterministico (`lib/domain`), mai da calcoli del modello.
- Questi vincoli vanno nel system prompt **e** vanno verificati da test (eval) con domande fuori perimetro.

## 2. Privacy e trasparenza

- **AI Act art. 50**: l'utente deve sapere che sta parlando con un'IA (etichetta visibile nella UI).
- **GDPR**:
  - base giuridica e consenso esplicito e separato all'attivazione della funzione (opt-in, revocabile);
  - DPA con il provider del modello (art. 28) e verifica dei trasferimenti extra-UE (artt. 44 e seguenti);
  - minimizzazione (art. 5): inviare aggregati e categorie, pseudonimizzare nomi di conti e persone, niente IBAN o note libere se non necessari;
  - nessun utilizzo dei dati per addestramento (verificare i termini del provider);
  - aggiornare informativa privacy e registro dei trattamenti; valutare una DPIA (dati finanziari + IA).
- **Retention**: conversazioni conservate per un periodo limitato e cancellabili dall'utente.
- **Abbonamento premium**: rispettare il Codice del Consumo (informazioni precontrattuali, diritto di recesso, rinnovo trasparente).

## 3. Architettura tecnica

- **Modello**: Claude API con tool use (Sonnet per il rapporto costo/qualità, Opus per gli scenari complessi), chiamato solo lato server.
- **Principio**: l'IA interpreta e pianifica, il codice calcola.
- **Tool** (wrapper sottili su `lib/domain`):
  - `get_monthly_summary(range)`: medie di entrate/uscite, categorie, stagionalità;
  - `get_projection(until)`: saldo previsto con le regole ricorrenti;
  - `simulate_scenario({ oneOffExpenses, categoryCuts, savingPlans })`: proiezione what-if su `simulateScenario` (`lib/domain/scenario.ts`), con punto minimo e ammanco rispetto a una soglia;
  - `get_upcoming_dues()`: scadenze note nel periodo.
- **Output strutturato**: verdetto, saldo minimo previsto, piano a tappe mensili, leve proposte, disclaimer.
- **Azioni**: la creazione di una regola dal piano usa `InlineConfirm` (UI senza modali).

## 4. Premium e costi

- Entitlement su `households` (es. `plan`/`entitlements`), controllato lato server nella route e in RLS.
- Quote mensili di richieste per nucleo; prompt caching sul contesto del nucleo; risposte brevi.

## 5. Fasi

1. `simulate_scenario` nel dominio, con unit test (utile anche come simulatore manuale senza IA).
2. Gating premium e quote.
3. Route IA con tool, system prompt con i vincoli della sezione 1, eval fuori perimetro, UI chat in `proiezioni`.
4. Tabella `goals` e creazione della regola dal piano proposto.
