"use client";

import { useCallback, useRef, useState } from "react";
import { getAdvisorQuota, openAdvisorConversation } from "@/app/actions/advisor";
import type { AdvisorQuota } from "@/lib/advisor/quota";
import { type AdvisorEvent, decodeEvents } from "@/lib/advisor/sse";
import type { AdvisorTurnView } from "@/lib/advisor/turns";

export interface PendingTurn {
  question: string;
  status: string;
}

export interface AdvisorChat {
  conversationId: string | null;
  title: string | null;
  turns: AdvisorTurnView[];
  pending: PendingTurn | null;
  error: string | null;
  quota: AdvisorQuota | null;
  ask: (question: string, page: string | null) => Promise<void>;
  open: (id: string) => Promise<void>;
  reset: () => void;
  loadQuota: () => Promise<void>;
}

const UNREACHABLE = "Assistente non raggiungibile. Controlla la connessione e riprova.";

/** Chat state shared by the desktop panel and the /chiedi page: one question at a time, streamed. */
export function useAdvisorChat(): AdvisorChat {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [turns, setTurns] = useState<AdvisorTurnView[]>([]);
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Questions left; null until loaded. Kept across conversations: it belongs to the user, not the chat.
  const [quota, setQuota] = useState<AdvisorQuota | null>(null);
  // Ignores the stream of a conversation the user has left.
  const session = useRef(0);

  const handle = useCallback((e: AdvisorEvent, question: string, mine: number) => {
    if (session.current !== mine) return;
    if (e.type === "conversation") {
      setConversationId(e.id);
      setTitle(e.title);
    } else if (e.type === "status") setPending({ question, status: e.label });
    else if (e.type === "quota") setQuota(e.quota);
    else if (e.type === "done") {
      setTurns((t) => [...t, e.turn]);
      setPending(null);
    } else {
      setError(e.message);
      setPending(null);
    }
  }, []);

  const ask = useCallback(
    async (question: string, page: string | null) => {
      const mine = session.current;
      setError(null);
      setPending({ question, status: "Sto pensando…" });
      try {
        const res = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, conversationId, page }),
        });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const { events, rest } = decodeEvents(buffer + value);
          buffer = rest;
          for (const e of events) handle(e, question, mine);
        }
      } catch {
        handle({ type: "error", message: UNREACHABLE }, question, mine);
      } finally {
        // A stream that ended without an answer must not leave the spinner on.
        if (session.current === mine) setPending(null);
      }
    },
    [conversationId, handle],
  );

  const reset = useCallback(() => {
    session.current++;
    setConversationId(null);
    setTitle(null);
    setTurns([]);
    setPending(null);
    setError(null);
  }, []);

  const open = useCallback(
    async (id: string) => {
      reset();
      const conv = await openAdvisorConversation(id);
      if (!conv) return setError("Conversazione non trovata.");
      setConversationId(conv.id);
      setTitle(conv.title);
      setTurns(conv.turns);
    },
    [reset],
  );

  const loadQuota = useCallback(async () => {
    // The counter is a hint: if it cannot load, the server still enforces the limits.
    setQuota(await getAdvisorQuota().catch(() => null));
  }, []);

  return { conversationId, title, turns, pending, error, quota, ask, open, reset, loadQuota };
}
