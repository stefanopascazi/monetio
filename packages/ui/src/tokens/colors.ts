// Semantic color tokens. Single source of truth: CSS, Tailwind theme and the
// design-system artifact are all generated from this list.
// Direction "Mint & Coral": mint = brand and money in, coral = attention and money out,
// periwinkle = forecasts and goals. Neutrals carry a faint green bias.
export type ThemeId = "light" | "dark";

export interface ColorToken {
  name: string;
  value: Record<ThemeId, string>;
  usage: string;
}

export const themes: { id: ThemeId; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
];

const c = (name: string, light: string, dark: string, usage: string): ColorToken => ({
  name,
  value: { light, dark },
  usage,
});

export const colors: ColorToken[] = [
  // Surfaces: cards are soft filled blocks, not outlined boxes.
  c("mio-bg", "#fbfcfb", "#0b0f0e", "App background behind every surface."),
  c("mio-surface", "#f1f4f3", "#151b19", "Default card fill: lists, charts, stat blocks. No border needed."),
  c("mio-surface-raised", "#ffffff", "#1d2522", "Inputs, open form panels, tooltips, navigation bar."),
  c("mio-surface-sunken", "#e7ecea", "#070a09", "Tracks and wells: segmented control, progress track, skeletons."),
  c("mio-border", "#e1e7e4", "#26302d", "Hairline dividers between rows. Decorative only."),
  c("mio-border-strong", "#77857f", "#6c7b75", "Input and control borders (3:1 on mio-bg, mio-surface and mio-surface-raised)."),

  // Ink
  c("mio-ink", "#0e1a16", "#eef4f1", "Primary text and amounts on every surface."),
  c("mio-ink-muted", "#4b5853", "#a7b4af", "Secondary text: meta lines, labels, helper copy."),
  c("mio-ink-subtle", "#57645f", "#8b9893", "Placeholders, axis ticks, timestamps (4.5:1 on mio-surface)."),

  // Brand: mint. A bright fill that always carries dark text.
  c("mio-brand", "#3ddc97", "#4ff0a8", "Primary buttons, selected segments, active nav pill, key highlights. Text on it is mio-on-brand."),
  c("mio-brand-hover", "#2bc985", "#78f5bd", "Hover and pressed state of mio-brand fills."),
  c("mio-brand-soft", "#d8f7e9", "#103a29", "Mint cards, selected rows and chips, brand badges."),
  c("mio-on-brand", "#05261a", "#04150d", "Text and icons on mio-brand fills."),
  c("mio-brand-ink", "#0a7448", "#5fe8a9", "Mint-colored text and links on surfaces and on mio-brand-soft."),

  // Accent: coral. Attention, due dates, highlights.
  c("mio-accent", "#ff7a59", "#ff8a6b", "Attention fills: due-soon markers, notification dots, highlight blocks."),
  c("mio-accent-soft", "#ffe7df", "#3d1a10", "Coral cards (upcoming payments), accent badges."),
  c("mio-on-accent", "#3a0f02", "#2a0a00", "Text on mio-accent fills."),
  c("mio-accent-ink", "#b23a1b", "#ff9e84", "Coral text on surfaces and on mio-accent-soft."),

  // Forecast: periwinkle. Anything that has not happened yet.
  c("mio-forecast", "#7b6cf0", "#a397ff", "Projection lines, goal meters, forecast bands."),
  c("mio-forecast-soft", "#ece9fe", "#241f4d", "Goal cards and projection badges."),
  c("mio-forecast-ink", "#5242cc", "#b6acff", "Forecast text on surfaces and on mio-forecast-soft."),

  // Money semantics: always paired with a sign and an icon.
  c("mio-income", "#0a7448", "#4fe0a0", "Income amounts, positive deltas, income bars."),
  c("mio-income-soft", "#d8f7e9", "#0f3426", "Income badges and row highlights."),
  c("mio-expense", "#bf3a1a", "#ff8a6b", "Expense amounts, negative deltas, expense bars."),
  c("mio-expense-soft", "#ffe7df", "#3d1a10", "Expense badges and row highlights."),
  c("mio-transfer", "#2f62c8", "#86abff", "Transfers between own accounts (neither income nor expense)."),
  c("mio-transfer-soft", "#e2eafb", "#16264a", "Transfer badges background."),

  // Status
  c("mio-warning", "#985700", "#f2b84b", "Due soon, budget near limit. Text and icons."),
  c("mio-warning-soft", "#fff1d6", "#36280b", "Warning notice and badge background."),
  c("mio-danger", "#c0281c", "#ff5f73", "Overdue, over budget, destructive actions."),
  c("mio-danger-soft", "#fde3e0", "#3e1512", "Danger notice and badge background."),
  c("mio-success", "#0a7448", "#4fe0a0", "Completed, paid, synced."),
  c("mio-success-soft", "#d8f7e9", "#0f3426", "Success notice and badge background."),
  c("mio-info", "#2f62c8", "#86abff", "Neutral information notices."),
  c("mio-info-soft", "#e2eafb", "#16264a", "Info notice background."),
  c("mio-focus", "#0e1a16", "#5fe8a9", "Focus ring, 2px solid, 2px offset (3:1 on every surface)."),

  // Data visualization (validated categorical order, do not reorder)
  c("mio-chart-1", "#12a372", "#1fae86", "Chart series 1 (green)."),
  c("mio-chart-2", "#f0643c", "#e2643f", "Chart series 2 (coral)."),
  c("mio-chart-3", "#3d6fe0", "#5a82e6", "Chart series 3 (blue)."),
  c("mio-chart-4", "#cf9a10", "#b8890f", "Chart series 4 (gold). Below 3:1 on light: always ship labels or legend values."),
  c("mio-chart-5", "#8a5cf0", "#9270ee", "Chart series 5 (violet)."),
  c("mio-chart-6", "#d6487e", "#cc4f82", "Chart series 6 (pink). Beyond six, fold into Other."),
  c("mio-chart-grid", "#e3e9e6", "#222b28", "Chart gridlines and baselines (1px solid)."),
];
