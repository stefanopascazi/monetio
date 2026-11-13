import { describe, expect, it } from "vitest";
import { advisorQuota, afterQuestion, DEFAULT_LIMITS, limitFrom, quotaBlock, quotaLabel } from "./quota";

const quota = (userToday: number, householdMonth: number) => advisorQuota({ userToday, householdMonth }, DEFAULT_LIMITS);

describe("limitFrom", () => {
  it("accepts positive integers only", () => {
    expect(limitFrom("30", 10)).toBe(30);
    expect(limitFrom("", 10)).toBe(10);
    expect(limitFrom(undefined, 10)).toBe(10);
    expect(limitFrom("0", 10)).toBe(10);
    expect(limitFrom("2.5", 10)).toBe(10);
  });
});

describe("advisorQuota", () => {
  it("counts what is left, never below zero", () => {
    expect(quota(3, 20)).toEqual({ leftToday: 7, leftMonth: 30, limits: DEFAULT_LIMITS });
    expect(quota(12, 60)).toMatchObject({ leftToday: 0, leftMonth: 0 });
  });

  it("takes one question off both counters", () => {
    expect(afterQuestion(quota(9, 40))).toMatchObject({ leftToday: 0, leftMonth: 9 });
    expect(afterQuestion(quota(10, 50))).toMatchObject({ leftToday: 0, leftMonth: 0 });
  });
});

describe("quotaBlock", () => {
  it("blocks on the month first, then on the day", () => {
    expect(quotaBlock(quota(10, 50))).toBe("Avete usato le 50 domande di questo mese: tornano disponibili dal 1° del mese prossimo.");
    expect(quotaBlock(quota(10, 20))).toBe("Hai usato le 10 domande di oggi: riprova domani.");
    expect(quotaBlock(quota(2, 20))).toBeNull();
  });
});

describe("quotaLabel", () => {
  it("shows the tighter counter", () => {
    expect(quotaLabel(quota(0, 8))).toBe("Restano 42 domande questo mese");
    expect(quotaLabel(quota(0, 49))).toBe("Resta 1 domanda questo mese");
    expect(quotaLabel(quota(9, 10))).toBe("Resta 1 domanda oggi (40 questo mese)");
    expect(quotaLabel(quota(6, 10))).toBe("Restano 40 domande questo mese");
  });
});
