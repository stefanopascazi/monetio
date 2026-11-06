// Runs a command with an env file loaded first, e.g. `node scripts/dev/with-env.ts .env.stack next dev`.
// Replaces `node --env-file` for Next, which forwards node flags via NODE_OPTIONS where --env-file is rejected.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mergeEnv } from "./env-file.ts";

const [file, cmd, ...args] = process.argv.slice(2);
if (!file || !cmd) throw new Error("Uso: node scripts/dev/with-env.ts <env-file> <comando> [argomenti]");

// Single command string: the shell resolves `next` from node_modules/.bin (next.cmd on Windows).
const child = spawn([cmd, ...args].join(" "), { stdio: "inherit", shell: true, env: mergeEnv(process.env, readFileSync(file, "utf8")) as NodeJS.ProcessEnv });
child.on("exit", (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 0)));
