import { describe, expect, it, vi } from "vitest";
import { createSerialQueue } from "./queue.ts";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createSerialQueue", () => {
  it("runs tasks one at a time in order", async () => {
    const queue = createSerialQueue(() => {});
    const order: string[] = [];
    const first = deferred();
    queue.push("a", async () => {
      order.push("a:start");
      await first.promise;
      order.push("a:end");
    });
    queue.push("b", async () => void order.push("b"));
    await Promise.resolve();
    expect(order).toEqual(["a:start"]);
    first.resolve();
    await queue.idle();
    expect(order).toEqual(["a:start", "a:end", "b"]);
  });

  it("rejects a key already queued or running, then accepts it again", async () => {
    const queue = createSerialQueue(() => {});
    const task = vi.fn(async () => {});
    expect(queue.push("a", task)).toBe(true);
    expect(queue.has("a")).toBe(true);
    expect(queue.push("a", task)).toBe(false);
    await queue.idle();
    expect(queue.has("a")).toBe(false);
    expect(queue.push("a", task)).toBe(true);
    await queue.idle();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("reports failures and keeps going", async () => {
    const onError = vi.fn();
    const queue = createSerialQueue(onError);
    const after = vi.fn(async () => {});
    queue.push("bad", async () => {
      throw new Error("boom");
    });
    queue.push("good", after);
    await queue.idle();
    expect(onError).toHaveBeenCalledWith("bad", expect.any(Error));
    expect(after).toHaveBeenCalled();
  });
});
