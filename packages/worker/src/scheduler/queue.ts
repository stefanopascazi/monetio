export interface SerialQueue {
  /** Enqueues a task under a key; returns false when that key is already queued or running. */
  push(key: string, task: () => Promise<void>): boolean;
  has(key: string): boolean;
  /** Resolves when every queued task has finished. */
  idle(): Promise<void>;
}

/** Runs tasks one at a time (concurrency 1): the VPS has a single vCore and 1 GB of RAM. */
export function createSerialQueue(onError: (key: string, error: unknown) => void): SerialQueue {
  const pending = new Set<string>();
  let tail: Promise<void> = Promise.resolve();

  return {
    push(key, task) {
      if (pending.has(key)) return false;
      pending.add(key);
      tail = tail.then(async () => {
        try {
          await task();
        } catch (error) {
          onError(key, error);
        } finally {
          pending.delete(key);
        }
      });
      return true;
    },
    has: (key) => pending.has(key),
    idle: () => tail,
  };
}
