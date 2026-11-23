// Pure helpers for the db:restore command line.

export interface RestoreOptions {
  mode: "list" | "remote" | "file";
  /** Backup selector (remote) or local path (file). */
  source: string;
  identity?: string;
  reset: boolean;
  yes: boolean;
  maxAgeHours?: number;
}

export interface RawRestoreArgs {
  list?: boolean;
  backup?: string;
  file?: string;
  identity?: string;
  reset?: boolean;
  yes?: boolean;
  "max-age-hours"?: string;
}

export const USAGE = "Uso: npm run db:restore -- --list | --backup <latest|AAAA-MM-GG|chiave> | --file <percorso> [--identity <file>] [--reset] [--yes] [--max-age-hours <n>]";

export function parseRestoreArgs(raw: RawRestoreArgs): RestoreOptions {
  const sources = [raw.list && "list", raw.backup !== undefined && "remote", raw.file !== undefined && "file"].filter(Boolean);
  if (sources.length !== 1) throw new Error(`Indica una sola tra --list, --backup e --file.\n${USAGE}`);
  const mode = sources[0] as RestoreOptions["mode"];
  let maxAgeHours: number | undefined;
  if (raw["max-age-hours"] !== undefined) {
    maxAgeHours = Number(raw["max-age-hours"]);
    if (!Number.isInteger(maxAgeHours) || maxAgeHours <= 0) throw new Error("--max-age-hours deve essere un intero positivo");
    if (mode !== "remote") throw new Error("--max-age-hours vale solo con --backup");
  }
  const source = mode === "remote" ? raw.backup! : mode === "file" ? raw.file! : "";
  if (mode !== "list" && !source.trim()) throw new Error(`Valore mancante.\n${USAGE}`);
  return { mode, source: source.trim(), identity: raw.identity, reset: !!raw.reset, yes: !!raw.yes, maxAgeHours };
}

/** Host and database shown before overwriting, so the operator confirms the right target. */
export function describeTarget(url: string): { host: string; database: string } {
  const u = new URL(url);
  return { host: u.hostname, database: decodeURIComponent(u.pathname.slice(1)) || "postgres" };
}

export function confirmationMatches(answer: string, host: string): boolean {
  return answer.trim() === host;
}

/** How a local file must be decoded, from its extension. */
export function fileFormat(path: string): "age" | "zstd" | "dump" {
  if (path.endsWith(".age")) return "age";
  if (path.endsWith(".zst")) return "zstd";
  if (path.endsWith(".dump")) return "dump";
  throw new Error("Estensione non riconosciuta: attesi .dump.zst.age, .dump.zst o .dump");
}
