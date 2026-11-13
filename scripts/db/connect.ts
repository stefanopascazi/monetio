import postgres from "postgres";
import { cleanUrl, sslFor } from "./ssl.ts";

/** Direct (non-pooled) connection for scripts; needs POSTGRES_URL_NON_POOLING. */
export function connect() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL_NON_POOLING is not set (local: start the Docker stack and create .env.local from .env.example)");
  return postgres(cleanUrl(url), { ssl: sslFor(url), max: 1, onnotice: () => {} });
}
