import { describe, expect, it } from "vitest";
import { disabledEmailSender, emailForEvent, isEmailKind } from "./email";

const event = {
  kind: "bank_consent" as const,
  dedupKey: "k",
  title: "Collegamento banca in scadenza",
  body: "Fineco <test>: scade tra 6 giorni",
  url: "/dati/banche",
};

describe("emailForEvent", () => {
  it("builds subject, text and escaped html with an absolute link", () => {
    const m = emailForEvent(event, "a@example.com", "https://monetio.example");
    expect(m.subject).toBe("MonetIO · Collegamento banca in scadenza");
    expect(m.text).toContain("https://monetio.example/dati/banche");
    expect(m.html).toContain("Fineco &lt;test&gt;");
    expect(m.to).toBe("a@example.com");
  });
});

describe("isEmailKind", () => {
  it("sends emails only for the bank consent", () => {
    expect(isEmailKind("bank_consent")).toBe(true);
    expect(isEmailKind("due_soon")).toBe(false);
  });
});

describe("disabledEmailSender", () => {
  it("never delivers", async () => {
    expect(await disabledEmailSender.send({ to: "a", subject: "s", text: "t", html: "h" })).toEqual({ delivered: false, reason: "email non configurata" });
  });
});
