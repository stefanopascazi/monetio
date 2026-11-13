// Server-sent events between /api/advisor and the chat: progress while tools run, then the answer.
import type { AdvisorQuota } from "./quota";
import type { AdvisorTurnView } from "./turns";

export type AdvisorEvent =
  | { type: "conversation"; id: string; title: string }
  | { type: "status"; label: string }
  | { type: "done"; turn: AdvisorTurnView }
  | { type: "quota"; quota: AdvisorQuota }
  | { type: "error"; message: string };

export function encodeEvent(e: AdvisorEvent): string {
  return `data: ${JSON.stringify(e)}\n\n`;
}

/** Splits a growing text buffer into complete events; returns them and the unfinished tail. */
export function decodeEvents(buffer: string): { events: AdvisorEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events = parts
    .map((p) => p.split("\n").find((l) => l.startsWith("data: ")))
    .filter((l): l is string => Boolean(l))
    .map((l) => JSON.parse(l.slice(6)) as AdvisorEvent);
  return { events, rest };
}
