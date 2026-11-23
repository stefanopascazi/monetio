// Restores a database backup made by the worker (#48) into a Supabase database (#108).
// Usage: npm run db:restore -- --list | --backup <latest|YYYY-MM-DD|key> | --file <path> [--identity <file>] [--reset] [--yes]
// Target: POSTGRES_URL_NON_POOLING (local stack by default; production via scripts/dev/with-env.ts .env.prod).
// Needs pg_restore/psql 18 (at least the pg_dump version on the VPS), age, zstd and rclone: on Windows run it in Docker (see docs/restore.md).
import "./load-local-env.ts";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { pgEnvFromUrl } from "./pg-env.ts";
import { runPipeline, type PipelineStep } from "./pipeline.ts";
import { applyMigrations, ensureMigrationsTable, MIGRATIONS_DIR } from "./apply-migrations.ts";
import { connect } from "./connect.ts";
import { MIGRATION_LOCK_KEY } from "./deploy-guard.ts";
import { confirmationMatches, describeTarget, fileFormat, parseRestoreArgs } from "./restore/args.ts";
import { backupAgeHours, parseBackupListing, pickBackup } from "./restore/backups.ts";
import { loadScript, qualified } from "./restore/load-script.ts";
import { parseMigrationRows, planMigrations } from "./restore/migrations.ts";
import { copyRowCount, dataEntries, dumpedSequences, dumpedTables, restoreList, SKIPPED_TABLES, stripUnsupportedSettings, withoutObjects } from "./restore/toc.ts";
import { inspectTarget, publicTables, verifyRestore, wipePublic } from "./restore/target.ts";
import { capture } from "./restore/tools.ts";

// Operator-facing failures: message only, no stack trace (cleanup in the finally blocks still runs first).
const fail = (error: unknown) => {
  console.error(`
Errore: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
};
process.on("uncaughtException", fail);
process.on("unhandledRejection", fail);

const { values } = parseArgs({
  options: {
    list: { type: "boolean" },
    backup: { type: "string" },
    file: { type: "string" },
    identity: { type: "string" },
    reset: { type: "boolean" },
    yes: { type: "boolean" },
    "max-age-hours": { type: "string" },
  },
});
const options = parseRestoreArgs(values);
const rclone = (...args: string[]): PipelineStep => ({ cmd: "rclone", args: ["--config", "", ...args] });

function remote(): string {
  const value = process.env.BACKUP_REMOTE;
  if (!value) throw new Error("BACKUP_REMOTE non impostata (es. r2:monetio-backups), insieme a RCLONE_CONFIG_R2_*");
  return value;
}

const listBackups = async () => parseBackupListing(await capture("rclone", ["--config", "", "lsf", "-R", "--files-only", remote()]));

if (options.mode === "list") {
  const entries = await listBackups();
  for (const e of entries) console.log(`${e.takenAt.toISOString()}  ${e.key}`);
  if (!entries.length) console.log("Nessun backup trovato.");
  process.exit(0);
}

const work = mkdtempSync(join(tmpdir(), "monetio-restore-"));
chmodSync(work, 0o700);
const dump = join(work, "db.dump");
const ac = new AbortController();

/** age identity file: --identity, or the key itself in BACKUP_AGE_IDENTITY (CI secret). */
function identityFile(): string {
  if (options.identity) return options.identity;
  const key = process.env.BACKUP_AGE_IDENTITY;
  if (!key) throw new Error("Serve la chiave privata age: --identity <file> oppure BACKUP_AGE_IDENTITY");
  const file = join(work, "identity.txt");
  writeFileSync(file, key.trim() + "\n", { mode: 0o600 });
  return file;
}

/** Leaves the plain custom-format dump in `dump` and returns its path. */
async function fetchDump(): Promise<string> {
  const decrypt = (): PipelineStep => ({ cmd: "age", args: ["--decrypt", "--identity", identityFile()] });
  const unzstd: PipelineStep = { cmd: "zstd", args: ["-d", "-q", "-o", dump] };
  if (options.mode === "remote") {
    const backup = pickBackup(await listBackups(), options.source);
    const age = backupAgeHours(backup, new Date());
    console.log(`Backup: ${backup.key} (${age} ore fa)`);
    if (options.maxAgeHours && age > options.maxAgeHours) throw new Error(`Il backup ha ${age} ore (massimo ${options.maxAgeHours})`);
    await runPipeline([rclone("cat", `${remote()}/${backup.key}`), decrypt(), unzstd], ac.signal);
    return dump;
  }
  console.log(`Backup: ${options.source}`);
  const format = fileFormat(options.source);
  if (format === "dump") return options.source;
  if (format === "zstd") await runPipeline([{ cmd: "zstd", args: ["-d", "-q", "-o", dump, options.source] }], ac.signal);
  else {
    const step = decrypt();
    await runPipeline([{ ...step, args: [...step.args, options.source] }, unzstd], ac.signal);
  }
  return dump;
}

async function confirm(host: string, database: string, reset: boolean) {
  console.log(`\nDestinazione: ${host} / ${database}`);
  console.log(reset ? "Lo schema public e gli utenti di auth verranno SOSTITUITI dal backup." : "Database vuoto: verrà popolato dal backup.");
  if (options.yes) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Per confermare digita l'host (${host}): `);
  rl.close();
  if (!confirmationMatches(answer, host)) throw new Error("Conferma non valida: nessuna modifica eseguita");
}

// RESTORE_TARGET_URL wins: lets the Docker service default to the local stack yet target another database.
if (process.env.RESTORE_TARGET_URL) process.env.POSTGRES_URL_NON_POOLING = process.env.RESTORE_TARGET_URL;
const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? "";
const sql = connect();
try {
  const file = await fetchDump();
  // Debian's pg_wrapper may pick an older client than expected: show which one runs.
  console.log(`Client: ${(await capture("pg_restore", ["--version"])).trim()}`);
  let entries = dataEntries(await capture("pg_restore", ["--list", file]));
  const backupMigrations = parseMigrationRows(
    await capture("pg_restore", ["--data-only", "--schema=public", "--table=_migrations", "--file=-", file]),
  );
  const plan = planMigrations(readdirSync(MIGRATIONS_DIR), backupMigrations);
  console.log(`Migration nel backup: ${plan.before.length} (ultima ${plan.before.at(-1)}), da applicare dopo: ${plan.after.length}`);

  const target = await inspectTarget(sql);
  if (!target.authTables.includes("users")) throw new Error("Lo schema auth di destinazione non esiste: serve un progetto Supabase (o lo stack locale) con GoTrue avviato");
  // Supabase keeps adding auth tables (features we do not use): skip the missing ones only when empty.
  const missingAuth = dumpedTables(entries, "auth").filter((t) => !target.authTables.includes(t));
  const withRows: string[] = [];
  for (const table of missingAuth) {
    const rows = copyRowCount(await capture("pg_restore", ["--data-only", "--schema=auth", `--table=${table}`, "--file=-", file]));
    if (rows > 0) withRows.push(`${table} (${rows} righe)`);
  }
  if (withRows.length) throw new Error(`Tabelle auth del backup assenti nella destinazione: ${withRows.join(", ")}. GoTrue di destinazione più vecchio del backup?`);
  if (missingAuth.length) console.warn(`Tabelle auth vuote assenti nella destinazione, saltate: ${missingAuth.join(", ")}`);
  entries = withoutObjects(entries, "auth", [...missingAuth, ...dumpedSequences(entries, "auth").filter((s) => !target.authSequences.includes(s))]);
  if (target.publicObjects > 0 && !options.reset) {
    throw new Error(`Lo schema public di destinazione non è vuoto (${target.publicObjects} oggetti). Per sovrascriverlo aggiungi --reset.`);
  }

  const { host, database } = describeTarget(url);
  await confirm(host, database, target.publicObjects > 0);

  // Concurrent db:migrate (e.g. a deploy) waits until the restore is over.
  await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
  if (target.publicObjects > 0) {
    console.log("Reset dello schema public...");
    await wipePublic(sql);
  }
  console.log("Ricostruzione dello schema del backup...");
  await ensureMigrationsTable(sql);
  await applyMigrations(sql, plan.before, () => {});

  console.log("Caricamento dei dati...");
  const listFile = join(work, "list.txt");
  const dataFile = join(work, "data.sql");
  writeFileSync(listFile, restoreList(entries));
  await capture("pg_restore", ["--data-only", `--use-list=${listFile}`, `--file=${dataFile}`, file]);
  writeFileSync(dataFile, stripUnsupportedSettings(readFileSync(dataFile, "utf8"), target.serverMajor));
  const clear = [
    ...(await publicTables(sql)).map((t) => qualified("public", t)),
    ...target.authTables.filter((t) => !SKIPPED_TABLES.includes(`auth.${t}`)).map((t) => qualified("auth", t)),
  ];
  const loadFile = join(work, "load.sql");
  writeFileSync(loadFile, loadScript(clear, dataFile));
  await capture("psql", ["-X", "-q", "-f", loadFile], pgEnvFromUrl(url));

  if (plan.after.length) console.log("Migration successive al backup...");
  await applyMigrations(sql, plan.after);

  const summary = await verifyRestore(sql);
  console.log("\nConteggi:", Object.entries(summary.counts).map(([k, v]) => `${k} ${v}`).join(", "));
  if (summary.counts.migrations === 0 || summary.counts.households === 0 || summary.counts.users === 0) throw new Error("Controllo fallito: tabelle principali vuote");
  if (summary.memberCheck === false) throw new Error("Controllo fallito: un membro non vede il proprio nucleo (permessi o RLS)");
  if (summary.memberCheck === null) console.warn("Nessun membro collegato a un utente: controllo RLS saltato");
  console.log("Ripristino completato.");
} finally {
  ac.abort();
  await sql.end();
  rmSync(work, { recursive: true, force: true });
}
