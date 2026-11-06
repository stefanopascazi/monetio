// Runs `docker compose <args>` wherever Docker lives: native CLI, or WSL on Windows without Docker Desktop.
// Usage: node scripts/docker/compose.ts -f docker-compose.dev.yml up -d
// Optional: MONETIO_WSL_DISTRO=Ubuntu-22.04 to pick the WSL distro (default distro otherwise).
import { spawn, spawnSync } from "node:child_process";
import { dockerRunner } from "./runner.ts";

const runner = dockerRunner({
  platform: process.platform,
  cwd: process.cwd(),
  distro: process.env.MONETIO_WSL_DISTRO,
  probe: (cmd, args) => spawnSync(cmd, args, { stdio: "ignore", timeout: 30_000 }).status === 0,
});

if (!runner) {
  console.error("Docker non trovato (né sul PATH né in WSL), oppure il demone non è avviato.");
  process.exit(1);
}

console.log(`Docker: ${runner.where}`);
const child = spawn(runner.cmd, [...runner.args, "compose", ...process.argv.slice(2)], { stdio: "inherit" });
child.on("exit", (code, signal) => (signal ? process.kill(process.pid, signal) : process.exit(code ?? 0)));
