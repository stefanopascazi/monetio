import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// CI builds (e.g. Vercel) run with NODE_ENV=production, which loads React's production build
// where `act` does not exist and every Testing Library render fails. Tests always use "test".
// (Object.assign: NODE_ENV is typed read-only by @types/node / Next.)
Object.assign(process.env, { NODE_ENV: "test" });

const shared = {
  environment: "jsdom",
  globals: false,
  css: false,
  env: { NODE_ENV: "test" },
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@monetio/ui": new URL("./packages/ui/src/index.ts", import.meta.url).pathname.replace(/^\/(\w:)/, "$1") } },
  test: {
    projects: [
      {
        extends: true,
        test: { ...shared, name: "ui", include: ["packages/**/*.test.{ts,tsx}"], setupFiles: ["./vitest.setup.ts", "./packages/ui/vitest.setup.en.ts"] },
      },
      {
        extends: true,
        test: {
          ...shared,
          name: "app",
          include: ["app/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,tsx}", "components/**/*.test.{ts,tsx}", "hooks/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
