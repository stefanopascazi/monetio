// Pure helper: decides how to reach a working Docker (native CLI or, on Windows, inside WSL).

export type Runner = { cmd: string; args: string[]; where: string };
/** Returns true when the command runs successfully. */
export type Probe = (cmd: string, args: string[]) => boolean;

// Fails when the daemon is down, not only when the CLI is missing.
const VERSION = ["version", "--format", "{{.Server.Version}}"];

export function dockerRunner(opts: { platform: string; cwd: string; probe: Probe; distro?: string }): Runner | null {
  const { platform, cwd, probe, distro } = opts;
  if (probe("docker", VERSION)) return { cmd: "docker", args: [], where: "docker" };
  if (platform !== "win32") return null;
  const target = distro ? ["-d", distro] : [];
  if (!probe("wsl", [...target, "-e", "docker", ...VERSION])) return null;
  // --cd accepts the Windows path and maps it to /mnt/<drive>/...
  return { cmd: "wsl", args: [...target, "--cd", cwd, "-e", "docker"], where: `WSL${distro ? ` (${distro})` : ""}` };
}
