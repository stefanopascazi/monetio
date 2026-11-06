import { describe, expect, it } from "vitest";
import { dockerRunner, type Probe } from "./runner";

const only = (cmd: string): Probe => (c) => c === cmd;

describe("dockerRunner", () => {
  it("prefers the native docker CLI", () => {
    expect(dockerRunner({ platform: "win32", cwd: "C:\\repo", probe: () => true })).toEqual({ cmd: "docker", args: [], where: "docker" });
  });

  it("falls back to WSL on Windows", () => {
    expect(dockerRunner({ platform: "win32", cwd: "C:\\repo", probe: only("wsl") })).toEqual({
      cmd: "wsl",
      args: ["--cd", "C:\\repo", "-e", "docker"],
      where: "WSL",
    });
  });

  it("targets a specific WSL distro", () => {
    const calls: string[][] = [];
    const runner = dockerRunner({ platform: "win32", cwd: "C:\\repo", distro: "Ubuntu", probe: (c, a) => (calls.push([c, ...a]), c === "wsl") });
    expect(runner?.args).toEqual(["-d", "Ubuntu", "--cd", "C:\\repo", "-e", "docker"]);
    expect(calls[1].slice(0, 5)).toEqual(["wsl", "-d", "Ubuntu", "-e", "docker"]);
  });

  it("returns null when docker is unavailable", () => {
    expect(dockerRunner({ platform: "linux", cwd: "/repo", probe: only("wsl") })).toBeNull();
    expect(dockerRunner({ platform: "win32", cwd: "C:\\repo", probe: () => false })).toBeNull();
  });
});
