// Thin wrapper over external CLIs (pg_restore, psql, rclone): stdout as text, stderr tail on failure.
import { spawn } from "node:child_process";

const STDERR_TAIL = 4_000;

export function capture(cmd: string, args: string[], env?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => (err = (err + chunk.toString()).slice(-STDERR_TAIL)));
    child.on("error", (error) => reject(new Error(`${cmd}: ${error.message} (è installato?)`)));
    child.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out).toString()) : reject(new Error(`${cmd} è uscito con ${code}: ${err.trim()}`))));
  });
}
