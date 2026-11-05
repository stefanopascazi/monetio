import postgres from "postgres";

/** Direct (non-pooled) connection for scripts; needs POSTGRES_URL_NON_POOLING. */
export function connect() {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL_NON_POOLING is not set (run with --env-file=.env.local)");
  // sslmode in the URL is handled by the ssl option; strip params postgres.js does not know.
  const clean = url.replace(/[?&](sslmode|supa|pgbouncer)=[^&]*/g, "").replace(/\?$/, "");
  return postgres(clean, { ssl: "require", max: 1, onnotice: () => {} });
}
