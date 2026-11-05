// Typography: three families and a fixed type scale.
export interface TextStyle {
  name: string;
  family: FamilyKey;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  textTransform?: "uppercase";
  tabular?: boolean;
  usage: string;
  sample?: string;
}

export type FamilyKey = "display" | "sans" | "mono";

export const families: Record<FamilyKey, string> = {
  display: '"Gabarito", "Segoe UI", system-ui, sans-serif',
  sans: '"Onest", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "Cascadia Mono", monospace',
};

// Google Fonts families used by the system (weights loaded).
export const googleFonts = [
  { family: "Gabarito", weights: [500, 600, 700, 800] },
  { family: "Onest", weights: [400, 500, 600, 700] },
  { family: "JetBrains Mono", weights: [400, 500] },
];

export const textStyles: TextStyle[] = [
  { name: "display-lg", family: "display", fontSize: "44px", lineHeight: "46px", fontWeight: 700, letterSpacing: "-0.03em", usage: "Greeting and hero headline on the home screen.", sample: "Hi Giulia" },
  { name: "display-md", family: "display", fontSize: "34px", lineHeight: "38px", fontWeight: 700, letterSpacing: "-0.025em", usage: "Page titles on desktop.", sample: "Accounts" },
  { name: "title-lg", family: "display", fontSize: "24px", lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.015em", usage: "Page titles on mobile, section headers.", sample: "Upcoming payments" },
  { name: "title-md", family: "sans", fontSize: "18px", lineHeight: "24px", fontWeight: 600, usage: "Card and panel titles.", sample: "Add transaction" },
  { name: "title-sm", family: "sans", fontSize: "15px", lineHeight: "20px", fontWeight: 600, usage: "Row titles: payee, account name.", sample: "Esselunga" },
  { name: "body-lg", family: "sans", fontSize: "17px", lineHeight: "26px", fontWeight: 400, usage: "Empty states and onboarding copy.", sample: "Invite your partner to share accounts." },
  { name: "body", family: "sans", fontSize: "15px", lineHeight: "22px", fontWeight: 400, usage: "Default text, form values.", sample: "Rent is due in 3 days." },
  { name: "body-sm", family: "sans", fontSize: "13px", lineHeight: "18px", fontWeight: 400, usage: "Meta lines, helper text, table cells.", sample: "Joint account · Today" },
  { name: "label", family: "sans", fontSize: "13px", lineHeight: "16px", fontWeight: 600, letterSpacing: "0.005em", usage: "Form labels, button text (sm), tabs.", sample: "Amount" },
  { name: "overline", family: "sans", fontSize: "11px", lineHeight: "14px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", usage: "Group headers in lists (dates, categories).", sample: "This week" },
  { name: "amount-xl", family: "display", fontSize: "48px", lineHeight: "50px", fontWeight: 700, letterSpacing: "-0.035em", tabular: true, usage: "Hero balance.", sample: "€48,210.35" },
  { name: "amount-lg", family: "display", fontSize: "26px", lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.02em", tabular: true, usage: "Stat blocks, account card balances.", sample: "€3,420.00" },
  { name: "amount-md", family: "sans", fontSize: "15px", lineHeight: "20px", fontWeight: 600, tabular: true, usage: "Amounts in rows and lists.", sample: "−€ 82.40" },
  { name: "mono", family: "mono", fontSize: "13px", lineHeight: "18px", fontWeight: 400, usage: "IBAN, references, import codes.", sample: "IT60 X054 2811 1010 0000 0123 456" },
];
