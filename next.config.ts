import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import { sentryBuildOptions } from "./lib/observability/sentry-build";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (ignored by Vercel).
  output: "standalone",
  experimental: {
    agentFeedback: true,
    // Statement uploads go through a Server Action (files up to 3 MB, Vercel caps bodies at 4.5 MB).
    serverActions: { bodySizeLimit: "4mb" },
  },
  cacheComponents: true,
  // Proiezioni moved under Analisi; the query string (e.g. ?mesi=36) is passed through.
  async redirects() {
    return [
      { source: "/proiezioni", destination: "/analisi/proiezioni", permanent: true },
      // The advisor left the Analisi tabs for the global chat (#39).
      { source: "/analisi/chiedi", destination: "/chiedi", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, sentryBuildOptions(process.env));
