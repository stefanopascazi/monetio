import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ADVISOR_AI_LABEL, ADVISOR_DISCLAIMER, ADVISOR_PLAN_DISCLAIMER } from "@/lib/advisor/perimeter";
import { AdvisorAnswerCard } from "./AdvisorAnswerCard";

vi.mock("@/app/actions/advisor", () => ({ rateAdvisorAnswer: vi.fn() }));

const answer = {
  question: "Possiamo permetterci 4.500 € a gennaio?",
  text: "Sì, se rimandate a febbraio.",
  refused: false,
  verdict: { title: "Sì, se…", tone: "warning" as const, goal: "Vacanza: 4500,00 €", lines: ["Mancano 300,00 €."] },
  paymentPlan: false,
  requestId: "req-1",
};

describe("AdvisorAnswerCard", () => {
  it("shows the AI label, the computed verdict, the explanation, the disclaimer and the rating", () => {
    render(<AdvisorAnswerCard answer={answer} />);
    expect(screen.getByText(ADVISOR_AI_LABEL)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Verdetto calcolato" })).toHaveTextContent("Sì, se…Vacanza: 4500,00 €Mancano 300,00 €.");
    expect(screen.getByText("Sì, se rimandate a febbraio.")).toBeInTheDocument();
    expect(screen.getByText(ADVISOR_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Utile" })).toBeInTheDocument();
  });

  it("warns that a user payment plan is only an estimate", () => {
    render(<AdvisorAnswerCard answer={{ ...answer, verdict: null, paymentPlan: true }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(ADVISOR_PLAN_DISCLAIMER);
  });

  it("hides verdict and rating on a refusal", () => {
    render(<AdvisorAnswerCard answer={{ ...answer, verdict: null, refused: true }} />);
    expect(screen.queryByRole("region", { name: "Verdetto calcolato" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Utile" })).toBeNull();
  });
});
