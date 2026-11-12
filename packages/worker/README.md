# @monetio/worker

Worker Node per i job che Vercel non può ospitare (#42). Gira sulla VPS come servizio systemd, esegue un job alla volta.

## Struttura

- `src/scheduler/`: coda seriale (concorrenza 1) e scheduler a intervalli.
- `src/jobs/`: job registrati in `registry.ts`, lock su DB (`job_locks`, migrazione 0018) e runner con heartbeat.
- `src/heartbeat.ts`: ping a Healthchecks.io (`HEALTHCHECK_URL_<JOB>`).
- `deploy/`: unità systemd, limite journald, provisioning e script di attivazione dei rilasci.

Il codice condiviso arriva dal root (es. `scripts/db/ssl.ts`) e viene incluso nel bundle. Il worker non deve importare `next` o `server-only`.

## Comandi (dal root)

- `npx vitest run --project worker`: unit test.
- `npm run worker:typecheck`: controllo tipi.
- `npm run worker:build`: bundle in `packages/worker/dist/worker.mjs`, autosufficiente (sulla VPS basta Node 24).

## Separazione da Vercel

- `.vercelignore` esclude `packages/worker`; `tsconfig.json` del root lo esclude dal typecheck di Next.
- `vercel.json` (`ignoreCommand`) salta il deploy se il commit tocca solo `packages/worker` o `.github`.
- Il deploy del worker parte da `.github/workflows/worker.yml` solo per modifiche al worker.

## Primo setup della VPS

1. Installa Tailscale e fai `tailscale up`.
2. Copia `deploy/` sulla VPS ed esegui `sudo bash provision.sh`; opzioni `PUBLIC_SSH=1` (SSH anche su IP pubblico) e `KEEP_PASSWORD_AUTH=1` (login con password), es. `sudo PUBLIC_SSH=1 bash provision.sh` (utente `monetio`, swap, ufw solo su tailnet, fail2ban, unattended-upgrades, Node 24 privato in `/opt/node24`, il Node di sistema resta intatto, systemd).
3. Compila `/etc/monetio-worker.env` partendo da `deploy/worker.env.example`.
4. Genera una chiave SSH per la CI e aggiungi la pubblica a `/home/monetio/.ssh/authorized_keys`.
5. Su GitHub (environment `production`): secrets `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` (OAuth client Tailscale con tag `tag:ci`), `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` (`ssh-keyscan <host-tailscale>`), variabile `VPS_HOST`.

I rilasci stanno in `/opt/monetio-worker/releases/<sha>`, con `current` come symlink; `activate.sh` fa rollback se il servizio non resta attivo. Log: `journalctl -u monetio-worker -f`.

## Backup (#48)

Job `backup`, giornaliero dopo le 01:00 UTC. L'ultimo successo è salvato in `job_locks.last_success_at`, quindi un riavvio o un deploy non lo rilanciano. La catena è `pg_dump` (schemi `public` e `auth`) | `zstd -3` | `age` | `rclone rcat`, con upload su R2 in streaming e nessun file locale. La domenica e il giorno 1 viene fatta anche una copia lato server in `weekly/` e `monthly/`.

- Retention con le lifecycle rules del bucket: `daily/` 7 giorni, `weekly/` 28, `monthly/` 180.
- Sulla VPS c'è solo la chiave pubblica `age`. La privata sta nel password manager e nel secret GitHub del test di ripristino.
- Il job si attiva compilando le variabili `BACKUP_*` e `RCLONE_CONFIG_R2_*` in `/etc/monetio-worker.env` (vedi `deploy/worker.env.example`).
- Test di ripristino: `.github/workflows/backup-restore-test.yml`, il giorno 3 di ogni mese o a mano. Ripristina l'ultimo backup su Postgres 17 usa e getta ed esegue controlli di coerenza (`scripts/restore-test.sh`).

## Errori (Sentry, #48)

Con `SENTRY_DSN` impostato in `/etc/monetio-worker.env`, i job falliti vengono inviati a Sentry con il tag `job` e la release (SHA del commit). Raccoglie solo errori: niente tracing, niente OpenTelemetry. Gli eventi passano da `lib/observability/scrub-event.ts`, che toglie email, IBAN, importi e valori delle righe Postgres. Senza DSN il reporting è spento.

Verifica della consegna, da lanciare a mano sulla VPS:

```bash
sudo systemd-run --pipe --wait -p User=monetio -p EnvironmentFile=/etc/monetio-worker.env /opt/node24/bin/node /opt/monetio-worker/current/worker.mjs --sentry-test
```

## Notifiche push (#28)

Job `push-deliver`, ogni minuto. Le notifiche passano dalla tabella `push_outbox` (migrazione 0023): chi le produce inserisce una riga (con `dedup_key` per non duplicarle), il worker la invia a tutte le `push_subscriptions` dell'utente con `web-push` e segna `sent_at`.

- Una subscription che risponde 404/410 viene cancellata. Gli altri errori vengono ritentati: al massimo 5 tentativi entro 24 ore.
- Le righe consegnate o abbandonate vengono cancellate dopo 30 giorni.
- Per attivarlo: genera le chiavi con `npx web-push generate-vapid-keys`, compila `VAPID_*` in `/etc/monetio-worker.env` e imposta su Vercel `NEXT_PUBLIC_VAPID_PUBLIC_KEY` con la stessa chiave pubblica. Serve un redeploy, perché la chiave viene inclusa nel build.
- Il pulsante "Invia notifica di prova" in Impostazioni accoda una riga (al massimo una al minuto) e verifica tutto il percorso.

### Eventi e campanella

Job `notify-events`, giornaliero alle 07:00 UTC (08:00 o 09:00 in Italia). Per ogni membro e per ogni nucleo carica i dati come li vede quell'utente: le query girano con ruolo `authenticated` e i claim JWT dell'utente, quindi la RLS applica la stessa visibilità dell'app. Poi calcola gli eventi con `lib/notifications/events.ts` e li mette in `push_outbox`; la `dedup_key` evita i doppioni tra un giorno e l'altro.

- Eventi: scadenza in arrivo (N giorni prima) e superata (solo entro 7 giorni), rimanenza di fine mese sotto soglia, conto senza movimenti da X giorni, stima mensile superata.
- Ogni riga appare subito nella campanella (`/notifiche`). Il push rispetta l'orario silenzioso (`push_after`) e i tipi silenziati, che arrivano solo nella campanella.
- Il job gira anche senza chiavi VAPID: la campanella funziona comunque.
- Il worker include codice di `lib/` (calcoli condivisi con l'app): `worker.yml` lo ridistribuisce anche quando cambia `lib/domain`, `lib/data`, `lib/notifications` o `lib/banking`.
- Vercel applica le migration alla fine del build, dopo il deploy del worker: il bundle contiene il nome dell'ultima migration e i job restano in pausa (log `waiting for migration, jobs paused`) finché non risulta in `_migrations`. Come rete di sicurezza, gli errori "tabella/colonna inesistente" sono tollerati per 15 minuti dall'avvio.
