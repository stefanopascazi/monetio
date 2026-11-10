import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline, type PipelineStep } from "./pipeline.ts";

// Real child processes (node itself) stand in for pg_dump | zstd | age | rclone.
const node = (code: string, env?: Record<string, string>): PipelineStep => ({ cmd: process.execPath, args: ["-e", code], env });
const signal = () => new AbortController().signal;

describe("runPipeline", () => {
  it("streams data through every step", async () => {
    const out = join(mkdtempSync(join(tmpdir(), "pipe-")), "out.txt");
    await runPipeline(
      [
        node("process.stdout.write('hello ' + process.env.WHO)", { WHO: "world" }),
        node("process.stdin.on('data', d => process.stdout.write(d.toString().toUpperCase()))"),
        node(`const fs = require('fs'); const c = []; process.stdin.on('data', d => c.push(d)).on('end', () => fs.writeFileSync(${JSON.stringify(out)}, Buffer.concat(c)))`),
      ],
      signal(),
    );
    expect(readFileSync(out, "utf8")).toBe("HELLO WORLD");
  });

  it("rejects with the failing step and its stderr", async () => {
    await expect(
      runPipeline([node("process.stdout.write('x')"), node("process.stderr.write('bad key'); process.exit(3)")], signal()),
    ).rejects.toThrow(/exited with 3: bad key/);
  });

  it("rejects when the producer fails", async () => {
    await expect(runPipeline([node("process.exit(1)"), node("process.stdin.resume()")], signal())).rejects.toThrow(/exited with 1/);
  });

  it("rejects when a command does not exist", async () => {
    await expect(runPipeline([{ cmd: "definitely-not-a-command-xyz", args: [] }], signal())).rejects.toThrow(/definitely-not-a-command-xyz/);
  });

  it("kills the steps on abort", async () => {
    const controller = new AbortController();
    const run = runPipeline([node("setInterval(() => {}, 1000)")], controller.signal);
    setTimeout(() => controller.abort(), 100);
    await expect(run).rejects.toThrow("aborted");
  });
});
