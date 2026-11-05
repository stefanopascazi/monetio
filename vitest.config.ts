import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// CI builds (e.g. Vercel) run with NODE_ENV=production, which loads React's production build
// where `act` does not exist and every Testing Library render fails. Tests always use "test".
// (Object.assign: NODE_ENV is typed read-only by @types/node / Next.)
Object.assign(process.env, { NODE_ENV: "test" });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: ["packages/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
    css: false,
    env: { NODE_ENV: "test" },
  },
});
