import { spawn, type ChildProcess } from "node:child_process";

export interface PipelineStep {
  cmd: string;
  args: string[];
  /** Extra environment for this step only (merged over process.env). */
  env?: Record<string, string>;
}

export type RunPipeline = (steps: PipelineStep[], signal: AbortSignal) => Promise<void>;

const STDERR_TAIL = 2_000;

/**
 * Streams stdout of each step into stdin of the next (like a shell pipe), with no temp files.
 * Resolves when every step exits 0; otherwise kills the rest and rejects with the failing
 * step and the tail of its stderr.
 */
export const runPipeline: RunPipeline = (steps, signal) =>
  new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    const children: ChildProcess[] = [];
    const stderr = steps.map(() => "");
    let remaining = steps.length;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
      reject(error);
    };
    const onAbort = () => fail(new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });

    steps.forEach((step, i) => {
      const child = spawn(step.cmd, step.args, {
        env: { ...process.env, ...step.env },
        stdio: [i === 0 ? "ignore" : "pipe", i === steps.length - 1 ? "ignore" : "pipe", "pipe"],
      });
      children.push(child);
      if (i > 0) {
        const upstream = children[i - 1].stdout!;
        upstream.pipe(child.stdin!);
        // A consumer dying early surfaces as its own exit code; ignore EPIPE noise.
        child.stdin!.on("error", () => {});
      }
      child.stderr!.on("data", (chunk: Buffer) => {
        stderr[i] = (stderr[i] + chunk.toString()).slice(-STDERR_TAIL);
      });
      child.on("error", (error) => fail(new Error(`${step.cmd}: ${error.message}`)));
      child.on("close", (code, sig) => {
        if (code !== 0) return fail(new Error(`${step.cmd} exited with ${code ?? sig}: ${stderr[i].trim()}`));
        if (--remaining === 0 && !settled) {
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve();
        }
      });
    });
  });
