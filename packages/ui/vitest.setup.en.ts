import { vi } from "vitest";

// Design-system tests assert the canonical English dictionary, whatever language the app ships.
vi.mock("./src/i18n/index.ts", async () => {
  const m = await vi.importActual<typeof import("./src/i18n/messages")>("./src/i18n/messages.ts");
  return { en: m.en, it: m.it, messages: m.en };
});
