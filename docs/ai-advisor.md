# Assistente IA (premium) - progetto e perimetro

Stato: sperimentazione in uso familiare (fasi 1 e 3; gating premium rimandato alla #40). Data: 2026-11-13.

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
- **Output strutturato**: verdetto (`assessGoal`: sì / no / sì se si rimanda, si spende meno o si taglia una categoria), saldo minimo previsto, piano a tappe mensili, leve proposte, disclaimer.
- **Azioni**: la creazione di una regola dal piano usa `InlineConfirm` (UI senza modali).

## 4. Premium e costi

- Entitlement su `households` (es. `plan`/`entitlements`), controllato lato server nella route e in RLS.
- Quote mensili di richieste per nucleo; prompt caching sul contesto del nucleo; risposte brevi.

## 5. Fasi

1. `simulate_scenario` nel dominio, con unit test (utile anche come simulatore manuale senza IA).
2. Gating premium e quote.
3. Route IA con tool, system prompt con i vincoli della sezione 1, eval fuori perimetro, UI chat in `proiezioni`.
4. Tabella `goals` e creazione della regola dal piano proposto.

## 6. Sperimentazione in uso familiare (2026-11-13)

Obiettivo: capire con l'uso reale se le risposte sono utili e quanto costano, prima di decidere premium e prezzi (#40).

- **Dove**: chat sempre disponibile da una bolla in basso a destra su ogni pagina. Su desktop si apre un pannello laterale non modale (la pagina resta usabile, Esc chiude); su telefono la pagina `/chiedi`. Le domande suggerite dipendono dalla pagina aperta, che viene indicata anche al modello.
- **Conversazioni**: titolo dalla prima domanda, elenco nella cronologia, "Nuova conversazione". Il modello riceve le ultime 6 domande e risposte della stessa conversazione (non i calcoli interni); i numeri sono sempre ricalcolati. Massimo 10 scambi per conversazione. Risposta in streaming (`/api/advisor`, eventi SSE) con lo stato dei calcoli.
- **Conservazione**: conversazioni private per utente. Il job `advisor-purge` del worker, una volta al giorno, cancella testi e verdetti delle richieste più vecchie di 30 giorni e le conversazioni ferme da 30 giorni; token, costi e voti restano. L'utente può eliminare una conversazione o tutte (`delete_advisor_conversations`), con lo stesso effetto.
- **Attivazione**: solo con `ANTHROPIC_API_KEY` sul server; `ADVISOR_MODEL` (default `claude-sonnet-5-5`), `ADVISOR_DAILY_LIMIT` (default 10 domande per utente al giorno) e `ADVISOR_MONTHLY_LIMIT` (default 50 domande per nucleo al mese) facoltativi. Giorni e mesi seguono Europe/Rome, le chiamate fallite non contano; la chat mostra le domande rimaste (RPC `advisor_usage`). Senza chiave la scheda mostra "Assistente non attivo".
- **Codice**: `lib/advisor/` (system prompt e perimetro, tool, ciclo, prezzi, vista del verdetto), `lib/data/advisor.ts`, `app/actions/advisor.ts`, `components/advisor/`.
- **Numeri**: il riquadro "Verdetto calcolato" mostra il risultato di `assessGoal`, non il testo del modello.
- **Leve calcolate**: rimandare, spendere meno, risparmiare X € in più al mese, tagliare una categoria (`assessGoal`); importo massimo e "comodo" per data, anche con risparmio extra (`affordableAmount`, tool `affordable_amounts`). Nessuna leva può portare sotto zero un conto non carta, anche fuori dal perimetro scelto.
- **Proposte di pagamento dell'utente** (decisione del 2026-11-13, da validare legalmente): l'IA non propone mai finanziamenti, rate, leasing o prodotti finanziari e non giudica convenienza o tassi. Se è l'utente a descrivere un piano che sta valutando (anticipo, rate, maxi rata), l'IA misura solo quelle uscite sul bilancio (`simulate_scenario` con `user_payment_plan`) e risponde Sì / No / Sì, se…, con leve di budget (risparmio extra, tagli, rinvio, Risparmi oltre la riserva), mai cambiando le condizioni dell'offerta. L'app mostra sempre l'avviso `ADVISOR_PLAN_DISCLAIMER` (stima ipotetica, non una valutazione del finanziamento, confrontarsi con un professionista) e il registro segna `payment_plan`.
- **Fondo di emergenza**: quando il piano include i Risparmi, la soglia minima è di 3 mesi di spesa media (`RESERVE_MONTHS`).
- **Dati inviati al modello**: nomi e tipi dei conti visibili all'utente, saldi, nomi delle categorie di spesa, proiezioni aggregate e affidabilità. Mai IBAN, carte, note, descrizioni dei movimenti o nomi dei membri.
- **Registro** (`advisor_requests` e `advisor_conversations`, migration 0025): domanda, risposta, verdetto, modello, token (input, output, cache), costo stimato in micro-dollari, durata, numero di tool, voto utile/da migliorare. Ogni utente vede e cancella solo le proprie righe; dopo l'inserimento si può cambiare solo il voto.
- **Test di perimetro dal vivo**: `ADVISOR_EVAL=1 npx vitest run lib/advisor/perimeter.eval` (costa, va lanciato a mano).
- **Prima del lancio pubblico restano**: consenso esplicito e revocabile, DPA e informativa (#49), gating premium (#40), validazione legale del perimetro.

Query utili sul registro:

```sql
-- Costo e qualità per settimana
select date_trunc('week', created_at) as settimana, count(*) as domande,
       round(sum(cost_micro_usd) / 1e6, 4) as costo_usd,
       round(avg(cost_micro_usd) / 1e6, 4) as costo_medio_usd,
       count(*) filter (where rating = 1) as utili, count(*) filter (where rating = -1) as da_migliorare
from advisor_requests group by 1 order by 1 desc;
```
