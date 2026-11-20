# Standard del manuale utente

Regole per scrivere e aggiornare il manuale di MonetIO (`docs/user-manual/index.html`).
Valgono per ogni nuova sezione. Il manuale è pubblicato come artifact su claude.ai e linkato dal README.

## A chi parliamo

Persone dai 18 ai 90 anni, anche poco pratiche di computer e telefono.
Ogni frase deve essere capita al primo colpo, senza rileggerla.

## Regole di scrittura

1. **Frasi brevi.** Massimo 12 parole. Se bastano 8, usane 8.
2. **Una frase, un'idea.** Un passaggio, un'azione.
3. **Dai del tu** e usa l'imperativo: "Premi", "Scrivi", "Scegli".
4. **Niente parole tecniche.** Se proprio serve, spiegala nel glossario "Parole utili".
5. **Nomi dei tasti uguali all'app**, in grassetto: premi **Salva movimento**.
6. **Percorsi con la freccina ›**: **Dati › Importa**.
7. **Niente frasi passive** ("viene salvato"): scrivi "MonetIO salva".
8. **Numeri in cifre** ("3 conti", non "tre conti").
9. **Esempi concreti** quando aiutano: "Es. bolletta della luce".
10. **Verbo "premi"** per mouse e dita: vale per computer e telefono.
11. **Niente nomi reali**: niente banche, negozi, marchi, telefoni o persone. Usa esempi generici ("Spesa al supermercato", "la tua banca").

Il titolo del manuale è sempre **Manuale d'uso**.

## Parole da evitare

| Non scrivere | Scrivi |
| --- | --- |
| input, campo, field | casella |
| form | riquadro, scheda da compilare |
| tab | scheda |
| click, tap, clicca | premi |
| toggle, switch | interruttore |
| dropdown, select | elenco |
| dashboard | Home |
| sync, sincronizzare | aggiornare |
| upload, caricare un file | scegliere il file |
| import (sostantivo) | importazione |
| default | di base |
| login, logout | entrare, uscire |
| account (per la persona) | il tuo profilo |
| push | notifiche sul telefono o sul computer |
| feature, funzionalità | funzione |

"Importo" resta "importo" (i soldi). Non confonderlo con "importare" (portare dentro movimenti da un file).

## Struttura di ogni funzione

Ogni funzione è un blocco con questo ordine. Le parti tra parentesi sono facoltative.

1. **Titolo**: verbo + oggetto. Es. "Aggiungere un movimento".
2. **A cosa serve**: una frase sola.
3. **Dove si trova**: il percorso nell'app.
4. **Come si fa**: passaggi numerati, massimo 6.
5. (**Buono a sapersi**): 1-3 consigli brevi.
6. (**Attenzione**): solo se un'azione non si può annullare.

## Struttura del manuale

- Capitoli nell'ordine in cui si usa l'app: primi passi, conti, movimenti, ricorrenze, scadenze, analisi, dati, assistente, notifiche, impostazioni.
- In fondo: "Se qualcosa non va" e "Parole utili".
- Ogni capitolo ha un'ancora (`id`) per poterlo linkare.

## Grafica

- Colori, caratteri e forme del design system MonetIO (`packages/ui`, tema Mint & Coral).
- Tema chiaro e scuro automatici.
- Testo grande (17 px) e righe corte per facilitare la lettura.
- Etichette colorate: verde per "Buono a sapersi", corallo per "Attenzione".

## Come aggiornare

1. Modifica `docs/user-manual/index.html` seguendo queste regole.
2. Aggiorna la data "Aggiornato il" in cima al manuale.
3. Ripubblica l'artifact sullo stesso indirizzo.
4. Ogni nuova funzione dell'app aggiunge o aggiorna la sua sezione nel manuale.
