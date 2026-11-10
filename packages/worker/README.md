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
