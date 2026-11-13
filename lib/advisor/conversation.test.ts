import { describe, expect, it } from "vitest";
import { canContinue, conversationTitle, HISTORY_TURNS, historyMessages, MAX_TURNS, pageAccount, pageContext, questionWithPage, toolStatus } from "./conversation";

describe("conversationTitle", () => {
  it("keeps a short question and cuts a long one at a word", () => {
    expect(conversationTitle("  Possiamo   permetterci una Tesla? ")).toBe("Possiamo permetterci una Tesla?");
    const title = conversationTitle("Sto valutando l'acquisto di una Tesla Model3 con queste modalità: prezzo 38.378 €, anticipo 8850 €");
    expect(title).toBe("Sto valutando l'acquisto di una Tesla Model3 con queste…");
    expect(title.length).toBeLessThanOrEqual(61);
  });
});

describe("historyMessages", () => {
  it("alternates question and answer, skipping purged turns, keeping the last ones", () => {
    const turns = [
      { question: "A?", answer: "a" },
      { question: null, answer: null },
      { question: "B?", answer: "b" },
    ];
    expect(historyMessages(turns)).toEqual([
      { role: "user", content: "A?" },
      { role: "assistant", content: "a" },
      { role: "user", content: "B?" },
      { role: "assistant", content: "b" },
    ]);
    const many = Array.from({ length: 9 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }));
    const sent = historyMessages(many);
    expect(sent).toHaveLength(HISTORY_TURNS * 2);
    expect(sent[0]).toEqual({ role: "user", content: "Q3" });
  });
});

describe("canContinue", () => {
  it("stops at the turn limit", () => {
    expect(canContinue(MAX_TURNS - 1)).toBe(true);
    expect(canContinue(MAX_TURNS)).toBe(false);
  });
});

describe("pageContext", () => {
  it("matches the page and falls back to generic suggestions", () => {
    expect(pageContext("/analisi/proiezioni?h=12").label).toBe("Proiezioni");
    expect(pageContext("/conti/abc").label).toBe("Conti");
    expect(pageContext("/").label).toBe("Home");
    expect(pageContext(null).suggestions.length).toBeGreaterThan(0);
  });

  it("tells the model the page only when it adds something", () => {
    expect(questionWithPage("Ce la facciamo?", "/analisi/proiezioni")).toBe("[Pagina aperta: Proiezioni]\nCe la facciamo?");
    expect(questionWithPage("Ce la facciamo?", "/")).toBe("Ce la facciamo?");
  });

  it("names the account of an account page, only when the user can see it", () => {
    const accounts = [{ id: "acc-1", name: "Conto cointestato" }];
    expect(questionWithPage("Questo conto regge?", "/conti/acc-1", accounts)).toBe(
      '[Pagina aperta: conto "Conto cointestato" (account_id acc-1). "Questo conto" è questo.]\nQuesto conto regge?',
    );
    expect(questionWithPage("Questo conto regge?", "/conti/other", accounts)).toBe("[Pagina aperta: Conti]\nQuesto conto regge?");
    expect(pageAccount("/conti/acc-1?tab=movimenti", accounts)).toEqual(accounts[0]);
  });
});

describe("toolStatus", () => {
  it("labels known tools and has a fallback", () => {
    expect(toolStatus("simulate_scenario")).toBe("Simulo lo scenario…");
    expect(toolStatus("x")).toBe("Sto facendo i conti…");
  });
});
