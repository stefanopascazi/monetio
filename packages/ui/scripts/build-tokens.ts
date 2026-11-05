// Generates CSS custom properties, the Tailwind v4 theme and the artifact tokens.json
// from the TypeScript token sources. Run: npm run tokens
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { colors, themes } from "../src/tokens/colors.ts";
import { motion, radius, shadows, sizes, spacing, zIndex } from "../src/tokens/scales.ts";
import { families, googleFonts, textStyles } from "../src/tokens/typography.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HEADER = "/* MonetIO Design System — generated from tokens.json */";

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log("wrote", path);
}

const themed = (id: "light" | "dark") =>
  [...colors.map((t) => `  --${t.name}: ${t.value[id]};`), ...shadows.map((t) => `  --${t.name}: ${t.value[id]};`)].join("\n");

const scalars = [...spacing, ...radius, ...sizes, ...motion, ...zIndex].map((t) => `  --${t.name}: ${t.value};`).join("\n");
const fontVars = Object.entries(families)
  .map(([k, v]) => `  --mio-font-${k}: ${v};`)
  .join("\n");

const textClasses = textStyles
  .map((s) =>
    [
      `.mio-text-${s.name} {`,
      `  font-family: var(--mio-font-${s.family});`,
      `  font-size: ${s.fontSize};`,
      `  line-height: ${s.lineHeight};`,
      `  font-weight: ${s.fontWeight};`,
      s.letterSpacing ? `  letter-spacing: ${s.letterSpacing};` : "",
      s.textTransform ? `  text-transform: ${s.textTransform};` : "",
      s.tabular ? "  font-variant-numeric: tabular-nums;" : "",
      "}",
    ]
      .filter(Boolean)
      .join("\n"),
  )
  .join("\n");

// 1. Package CSS: light by default, dark via OS preference or data-theme.
const tokensCss = `${HEADER}
:root,
[data-theme="light"] {
  color-scheme: light;
${themed("light")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${themed("dark")}
  }
}

[data-theme="dark"] {
  color-scheme: dark;
${themed("dark")}
}

:root {
${scalars}
${fontVars}
}

${textClasses}
`;
write(resolve(root, "src/styles/tokens.css"), tokensCss);

// 2. Tailwind v4 theme bridge: utilities like bg-surface, text-ink, rounded-lg map to tokens.
const tw = [
  "/* Tailwind v4 theme bridge for @monetio/ui. Import after tailwindcss. */",
  "@theme inline {",
  ...colors.map((t) => `  --color-${t.name.replace(/^mio-/, "")}: var(--${t.name});`),
  ...radius.map((t) => `  --radius-${t.name.replace(/^mio-radius-/, "")}: var(--${t.name});`),
  ...shadows.map((t) => `  --shadow-${t.name.replace(/^mio-shadow-/, "")}: var(--${t.name});`),
  ...Object.keys(families).map((k) => `  --font-${k}: var(--mio-font-${k});`),
  ...spacing.map((t) => `  --spacing-${t.name.replace(/^mio-space-/, "")}: var(--${t.name});`),
  "}",
  "",
].join("\n");
write(resolve(root, "src/styles/tailwind-theme.css"), tw);

// 3. Artifact tokens.json (list-shaped families as the design-system page expects).
const tokensJson = {
  name: "MonetIO",
  version: 1,
  color: { themes, tokens: colors },
  type: {
    fonts: [],
    families,
    groups: [
      { name: "Display", family: "display", styles: textStyles.filter((s) => s.family === "display").map(toStyle) },
      { name: "Text", family: "sans", styles: textStyles.filter((s) => s.family === "sans").map(toStyle) },
      { name: "Data", family: "mono", styles: textStyles.filter((s) => s.family === "mono").map(toStyle) },
    ],
  },
  spacing: { tokens: spacing },
  radius: { tokens: radius },
  shadow: { tokens: shadows },
  size: { tokens: sizes },
  zIndex: { tokens: zIndex },
  meta: { source: "packages/ui/src/tokens", googleFonts },
};

function toStyle(s: (typeof textStyles)[number]) {
  return {
    name: s.name,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
    fontWeight: s.fontWeight,
    ...(s.letterSpacing ? { letterSpacing: s.letterSpacing } : {}),
    usage: s.usage,
    ...(s.sample ? { sample: s.sample } : {}),
  };
}

const outDir = process.argv[2];
if (outDir) write(resolve(outDir, "tokens.json"), JSON.stringify(tokensJson, null, 2));
write(resolve(root, "dist-artifact/tokens.json"), JSON.stringify(tokensJson, null, 2));
// Same text as the package tokens, for the artifact preview frame.
write(resolve(root, "dist-artifact/tokens.css"), tokensCss);
