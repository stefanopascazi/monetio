// Runs a command with an env file loaded first, e.g. `node scripts/dev/with-env.ts .env.prod npm run db:migrate`.
// Replaces `node --env-file` for Next, which forwards node flags via NODE_OPTIONS where --env-file is rejected.
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { leakingKeys, mergeEnv } from "./env-file.ts";

const [file, cmd, ...args] = process.argv.slice(2);
if (!file || !cmd) throw new Error("Uso: node scripts/dev/with-env.ts <env-file> <comando> [argomenti]");

const contents = readFileSync(file, "utf8");
const leaks = existsSync(".env.local") ? leakingKeys(readFileSync(".env.local", "utf8"), contents) : [];
if (leaks.length) console.warn(`Attenzione: ${file} non definisce ${leaks.join(", ")}; Next li prenderebbe da .env.local.`);

// Single command string: the shell resolves `next` from node_modules/.bin (next.cmd on Windows).
const child = spawn([cmd, ...args].join(" "), { stdio: "inherit", shell: true, env: mergeEnv(process.env, contents, file) as NodeJS.ProcessEnv });
child.on("exit", (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 0)));
