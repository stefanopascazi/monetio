# CI, deploy e token GitHub

Passi manuali per far funzionare il deploy tramite GitHub Actions (#123) e il ripristino di prova dalla console (#105).

## Deploy dell'app (#123)

Da quando c'è `.github/workflows/app.yml`, Vercel non costruisce più al push. Il workflow lancia i test a ogni push e, solo se passano, fa il deploy: preview per i branch, produzione per `main`. Le migration di produzione restano nel build di Vercel (`db:migrate`).

### 1. Token Vercel

1. Vercel → Account Settings → Tokens → Create.
2. Scope: il team del progetto MonetIO. Scadenza a scelta (annota quando rinnovarlo).
3. Copia il valore: serve al punto 3.

### 2. ID del team e del progetto

- **Team ID**: Vercel → Team Settings → General → Team ID.
- **Project ID**: progetto monetio → Settings → General → Project ID.

In alternativa: `npx vercel link` nella cartella del repository crea `.vercel/project.json` con `orgId` e `projectId`. La cartella è ignorata da git: non va committata.

### 3. Secrets del repository

GitHub → repository monetio → Settings → Secrets and variables → Actions → New repository secret:

| Nome | Valore |
| --- | --- |
| `VERCEL_TOKEN` | token del punto 1 |
| `VERCEL_ORG_ID` | Team ID |
| `VERCEL_PROJECT_ID` | Project ID |

### 4. Merge obbligatorio solo con test verdi (consigliato)

GitHub → Settings → Branches → regola per `main` → "Require status checks to pass before merging" → seleziona il check `test`. Il check compare nell'elenco dopo la prima esecuzione del workflow.

### 5. Verifica

1. Push di un branch: in Actions il workflow `app` esegue `test`, poi `deploy`. Il riepilogo dell'esecuzione mostra l'URL della preview.
2. Dopo il merge su `main`: `deploy` crea il deploy di produzione. Nei log del build su Vercel compare `db:migrate`.
3. Un push con un test rosso non deve creare deploy.

## Ripristino di prova dalla console (#105)

La pagina Backup della console avvia `.github/workflows/backup-restore-test.yml` con il backup scelto. Serve un token GitHub nel progetto Vercel della console.

### Token GitHub fine-grained

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
2. **Repository access**: Only select repositories → `monetio`.
3. **Permissions → Repository permissions → Actions: Read and write**. Con "Read-only" la console elenca le prove ma non può avviarle: GitHub risponde 403 e la console dice di controllare il token.
4. Metadata: Read-only (lo aggiunge GitHub in automatico).
5. Nessun altro permesso.

### Variabile su Vercel

Progetto monetio-admin → Settings → Environment Variables:

- `GITHUB_RESTORE_TOKEN` = il token (ambiente Production).
- `GITHUB_RESTORE_REPO` = `stefanopascazi/monetio` (facoltativa, è il valore predefinito).

Dopo averla cambiata serve un nuovo deploy della console: le variabili si leggono solo al deploy.

### Environment `backup`

Il workflow usa l'environment GitHub `backup`, che contiene la chiave privata `age` e i token R2. Se l'environment richiede un'approvazione (Settings → Environments → backup → Required reviewers), anche le prove avviate dalla console restano in attesa finché non le approvi su GitHub.
