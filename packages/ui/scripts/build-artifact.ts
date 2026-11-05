// Builds the design-system artifact file tree from the package sources.
// Usage: node scripts/build-artifact.ts <outDir>   (outDir receives project/...)
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, transformSync, type Plugin } from "esbuild";
import { catalog } from "./artifact/catalog.ts";
import { colors } from "../src/tokens/colors.ts";
import { motion, radius, shadows, sizes, spacing, zIndex } from "../src/tokens/scales.ts";
import { families, googleFonts, textStyles } from "../src/tokens/typography.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, "dist-artifact/tree"));
const project = join(out, "project");
const TITLE = "MonetIO";
const NAMESPACE = "MonetIO";

rmSync(project, { recursive: true, force: true });
const write = (rel: string, content: string) => {
  const p = join(project, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};

// --- 1. bundle.js: one classic script assigning window.MonetIO, React from globals.
const reactGlobals: Plugin = {
  name: "react-globals",
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (a) => ({ path: a.path, namespace: "rg" }));
    b.onLoad({ filter: /.*/, namespace: "rg" }, (a) => {
      if (a.path === "react/jsx-runtime" || a.path === "react/jsx-dev-runtime") {
        return {
          contents:
            // jsxs gets static children arrays: spread them so React does not ask for keys.
            "var R=window.React;function jsx(t,p,k){return R.createElement(t,k===undefined?p:Object.assign({},p,{key:k}))}" +
            "function jsxs(t,p,k){var q=Object.assign({},p),c=q.children;delete q.children;if(k!==undefined)q.key=k;" +
            "return R.createElement.apply(null,[t,q].concat(c))}" +
            "module.exports={Fragment:R.Fragment,jsx:jsx,jsxs:jsxs,jsxDEV:jsx};",
          loader: "js",
        };
      }
      return { contents: `module.exports=window.${a.path.startsWith("react-dom") ? "ReactDOM" : "React"};`, loader: "js" };
    });
  },
};

const result = await build({
  entryPoints: [join(root, "scripts/artifact/entry.ts")],
  bundle: true,
  format: "iife",
  globalName: "__mio",
  platform: "browser",
  target: "es2019",
  minify: true,
  write: false,
  jsx: "automatic",
  plugins: [reactGlobals],
  logLevel: "error",
});
const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: NAMESPACE, components: catalog.map((c) => ({ name: c.name })) })} */`;
let bundle = `${header}\n${result.outputFiles[0].text}\nwindow.${NAMESPACE}=__mio;\n`;
bundle = bundle.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--");
write("components/bundle.js", bundle);

// --- 2. bundle.css: fonts + non-color scalars the page does not emit + base + components.
const fontsUrl = `https://fonts.googleapis.com/css2?${googleFonts
  .map((f) => `family=${f.family.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
  .join("&")}&display=swap`;
const stylesDir = join(root, "src/styles");
const componentCss = readFileSync(join(stylesDir, "components.css"), "utf8")
  .split("\n")
  .map((l) => /@import "(.+)";/.exec(l)?.[1])
  .filter(Boolean)
  .map((rel) => readFileSync(resolve(stylesDir, rel!), "utf8"))
  .join("\n");
const textClasses = textStyles
  .map(
    (s) =>
      `.mio-text-${s.name}{font-family:var(--mio-font-${s.family});font-size:${s.fontSize};line-height:${s.lineHeight};font-weight:${s.fontWeight};${s.letterSpacing ? `letter-spacing:${s.letterSpacing};` : ""}${s.textTransform ? `text-transform:${s.textTransform};` : ""}${s.tabular ? "font-variant-numeric:tabular-nums;" : ""}}`,
  )
  .join("\n");
const css = [
  `@import url("${fontsUrl}");`,
  "/* Font and motion variables (tokens.json carries colors, spacing, radius, shadow, size). */",
  `:root{${Object.entries(families)
    .map(([k, v]) => `--mio-font-${k}:var(--font-${k},${v});`)
    .join("")}${motion.map((t) => `--${t.name}:${t.value};`).join("")}}`,
  "html{background:var(--mio-bg)}",
  "body{margin:0;padding:16px;background:var(--mio-bg);color:var(--mio-ink);font-family:var(--mio-font-sans)}",
  readFileSync(join(stylesDir, "base.css"), "utf8"),
  textClasses,
  componentCss,
].join("\n");
if (/<\/style/i.test(css)) throw new Error("bundle.css contains </style");
write("components/bundle.css", css);

// --- 3. index.d.ts: declarations concatenated into one documentation file.
const dtsDir = join(root, "dist-artifact/dts");
rmSync(dtsDir, { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    resolve(root, "../../node_modules/typescript/bin/tsc"),
    join(root, "src/index.ts"),
    "--declaration",
    "--emitDeclarationOnly",
    "--jsx",
    "react-jsx",
    "--moduleResolution",
    "bundler",
    "--module",
    "esnext",
    "--target",
    "es2020",
    "--skipLibCheck",
    "--outDir",
    dtsDir,
  ],
  { stdio: "inherit" },
);
const dtsFiles: string[] = [];
const walk = (d: string) =>
  readdirSync(d).forEach((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".d.ts") && !p.endsWith("index.d.ts")) dtsFiles.push(p);
  });
walk(dtsDir);
const reactNames = new Set<string>();
const bodies = dtsFiles.sort().map((f) => {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/import (?:type )?\{([^}]+)\} from "react";/g))
    m[1].split(",").forEach((n) => reactNames.add(n.replace(/^\s*type\s+/, "").trim()));
  const body = src
    .split("\n")
    .filter((l) => !/^import /.test(l) && l.trim() !== "export {};")
    .join("\n")
    .replace(/import\("[^"]+"\)\./g, "")
    .trim();
  return `// ${f.slice(dtsDir.length + 1).replace(/\\/g, "/")}\n${body}`;
});
write(
  "components/index.d.ts",
  `import type { ${[...reactNames].filter(Boolean).sort().join(", ")} } from "react";\nimport type { JSX } from "react";\n\n${bodies.join("\n\n")}\n\ndeclare global { interface Window { ${NAMESPACE}: Record<string, unknown> } }\n`,
);

// --- 4. tokens.json + first tokens.css (compiled layout the page also produces).
const tokensJson = JSON.parse(readFileSync(join(root, "dist-artifact/tokens.json"), "utf8"));
delete tokensJson.meta.googleFonts;
write("tokens.json", JSON.stringify(tokensJson, null, 2));
const themed = (id: "light" | "dark") =>
  [...colors.map((t) => `--${t.name}:${t.value[id]};`), ...shadows.map((t) => `--${t.name}:${t.value[id]};`)].join("");
write(
  "tokens.css",
  [
    `/* ${TITLE} — generated from tokens.json */`,
    `:root,[data-theme="light"]{${themed("light")}}`,
    `[data-theme="dark"]{${themed("dark")}}`,
    `:root{${[...spacing, ...radius, ...sizes, ...zIndex].map((t) => `--${t.name}:${t.value};`).join("")}${Object.entries(families)
      .map(([k, v]) => `--font-${k}:${v};`)
      .join("")}}`,
    ...textStyles.map(
      (s) =>
        `.${s.name}{font-family:var(--font-${s.family});font-size:${s.fontSize};line-height:${s.lineHeight};font-weight:${s.fontWeight};${s.letterSpacing ? `letter-spacing:${s.letterSpacing};` : ""}}`,
    ),
    "",
  ].join("\n"),
);

// --- 5. previews + guidelines per component.
for (const c of catalog) {
  const js = transformSync(`function Demo(){return (${c.demo.trim()});}`, {
    loader: "jsx",
    jsx: "transform",
    jsxFactory: "h",
    jsxFragment: "F",
    target: "es2019",
  }).code;
  if (/<\/script|<!--/i.test(js)) throw new Error(`Preview ${c.name} contains a forbidden sequence`);
  write(
    `components/${c.name}/preview.html`,
    `<!-- @dsCard group="${c.group}" height=${c.height} -->
<!doctype html>
<html>
<head><meta charset="utf-8"><title>${c.name} — preview</title></head>
<body class="mio-root">
<div id="root"></div>
<script>
var M = window.${NAMESPACE}, h = React.createElement, F = React.Fragment, useState = React.useState, TODAY = new Date(2026, 10, 5);
${js}
ReactDOM.createRoot(document.getElementById("root")).render(h(Demo));
</script>
</body>
</html>
`,
  );
  write(`components/${c.name}/README.md`, `# ${c.name}\n\n${c.readme}\n`);
}

// --- 6. hand-written brand book and cover.
cpSync(join(root, "scripts/artifact/README.md"), join(project, "README.md"));
cpSync(join(root, "scripts/artifact/cover.html"), join(project, "components/Cover/preview.html"));

console.log(`artifact tree written to ${project}`);
