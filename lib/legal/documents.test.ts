import { describe, expect, it } from "vitest";
import { LEGAL_OWNER } from "./owner";
import { PRIVACY_POLICY } from "./privacy";
import { TERMS_OF_USE } from "./terms";

const text = (doc: typeof PRIVACY_POLICY) => doc.sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.items ?? [])]).join(" ");

describe("legal documents", () => {
  it.each([PRIVACY_POLICY, TERMS_OF_USE])("$title names the owner contact and the PSD2 provider", (doc) => {
    expect(text(doc)).toContain(LEGAL_OWNER.email);
    expect(text(doc)).toContain("Enable Banking");
    expect(doc.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("states read-only bank access and no advice", () => {
    expect(text(PRIVACY_POLICY)).toMatch(/sola lettura/);
    expect(text(TERMS_OF_USE)).toMatch(/non costituiscono consulenza/i);
  });

  it("has unique section titles (used as React keys)", () => {
    for (const doc of [PRIVACY_POLICY, TERMS_OF_USE]) {
      const titles = doc.sections.map((s) => s.title);
      expect(new Set(titles).size).toBe(titles.length);
    }
  });
});
