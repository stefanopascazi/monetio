// Conversation rules of the advisor chat: what earlier turns the model sees, limits, titles, page hints.
import type Anthropic from "@anthropic-ai/sdk";

/** Exchanges per conversation: past this the chat offers a new one, so the context stays small. */
export const MAX_TURNS = 10;
/** Earlier exchanges sent back to the model (question + final answer only, no tool internals). */
export const HISTORY_TURNS = 6;
const TITLE_MAX = 60;

export interface PastTurn {
  question: string | null;
  answer: string | null;
}

export function canContinue(turns: number): boolean {
  return turns < MAX_TURNS;
}

/** Title from the first question, cut at a word boundary. */
export function conversationTitle(question: string): string {
  const q = question.replace(/\s+/g, " ").trim();
  if (q.length <= TITLE_MAX) return q;
  const cut = q.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

/** Earlier exchanges as alternating messages; purged or failed turns are skipped. */
export function historyMessages(turns: PastTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return turns
    .filter((t): t is { question: string; answer: string } => Boolean(t.question && t.answer))
    .slice(-HISTORY_TURNS)
    .flatMap((t) => [
      { role: "user" as const, content: t.question },
      { role: "assistant" as const, content: t.answer },
    ]);
}

interface PageContext {
  label: string;
  suggestions: string[];
}

const GENERIC: PageContext = {
  label: "Home",
  suggestions: ["Possiamo permetterci una vacanza di 2.000 € in estate?", "Quanto potremmo spendere per un'auto nuova tra un anno?", "Se risparmiamo 100 € al mese, cosa cambia?"],
};

const PAGES: [prefix: string, context: PageContext][] = [
  [
    "/analisi/proiezioni",
    { label: "Proiezioni", suggestions: ["Quando il saldo sarà più basso nei prossimi mesi?", "Se a marzo spendiamo 2.000 €, ce la facciamo?", "Come cambia la proiezione tagliando i ristoranti del 30%?"] },
  ],
  [
    "/analisi/statistiche",
    { label: "Statistiche", suggestions: ["Su quali categorie potremmo risparmiare 150 € al mese?", "Se riduciamo lo svago del 20%, quanto mettiamo da parte in un anno?"] },
  ],
  ["/conti", { label: "Conti", suggestions: ["Questo conto regge le spese dei prossimi tre mesi?", "Quanto possiamo spostare sui risparmi ogni mese?"] }],
  ["/scadenze", { label: "Scadenze", suggestions: ["Le scadenze dei prossimi mesi sono sostenibili?", "Possiamo aggiungere un accantonamento di 200 € al mese?"] }],
];

/** Where the chat was opened: a label for the model and suggestions for the empty chat. */
export function pageContext(pathname: string | null | undefined): PageContext {
  const match = PAGES.find(([prefix]) => pathname?.startsWith(prefix));
  return match ? match[1] : GENERIC;
}

/** First user message: the question, with the page the user is looking at when it says something. */
export function questionWithPage(question: string, pathname: string | null | undefined): string {
  const { label } = pageContext(pathname);
  return label === GENERIC.label ? question : `[Pagina aperta: ${label}]\n${question}`;
}

const STATUS: Record<string, string> = {
  get_household_overview: "Leggo conti e categorie…",
  get_projection: "Calcolo la proiezione…",
  assess_goal: "Verifico se ve lo potete permettere…",
  affordable_amounts: "Calcolo quanto potete spendere…",
  simulate_scenario: "Simulo lo scenario…",
};

/** Progress line shown while a tool runs. */
export function toolStatus(name: string): string {
  return STATUS[name] ?? "Sto facendo i conti…";
}
