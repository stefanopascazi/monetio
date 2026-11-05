# AGENTS.md - MonetIO

Questo file e' il contesto operativo rapido per agenti AI che lavorano su Shoots. Leggilo prima di modificare codice.

## Regole tecniche da preservare

- Verifica sempre il flusso end-to-end

## Convenzioni di lavoro

- Best Practice deve essere un mantra: evitare file monolitici, separare componenti UI, servizi wiring e logiche riusabili in moduli/cartelle dedicati.
- Nei renderer Next/React, preferire componenti separati e hook/servizi riusabili invece di accumulare JSX/TSX, state management e utility nello stesso file.
- Aggiungere commenti solo dove aiutano a chiarire logica non ovvia, sempre e solo in inglese.
- NON CREARE MAI NUOVI BRANCH
- Per modifiche dentro repo git, eseguire `git add` e `git commit` con messaggio coerente.
- I commit devono seguire sempre la semantic release.
- Never include your signature in commits or commit descriptions.
- usa sempre e solamente testi in inglese per la UI
- Ad ogni nuova funzione va creato il suo unitTest
- Ad ogni modifica, va verificato anche il suo unitTest
- Non creare mai nuovi branch