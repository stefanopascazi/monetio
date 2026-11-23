import { describe, expect, it } from "vitest";
import { copyRowCount, dataEntries, dumpedSequences, dumpedTables, restoreList, stripUnsupportedSettings, withoutObjects } from "./toc.ts";

// Lines as printed by `pg_restore --list` for a worker backup.
const TOC = [
  ";",
  "; Archive created at 2026-11-23 14:25:00 UTC",
  "4436; 0 16470 TABLE DATA auth refresh_tokens supabase_auth_admin",
  "4439; 0 16496 TABLE DATA auth schema_migrations supabase_auth_admin",
  "4440; 0 16500 TABLE DATA auth users supabase_auth_admin",
  "4454; 0 17090 TABLE DATA public _migrations postgres",
  "4457; 0 17211 TABLE DATA public accounts ",
  "4460; 0 17300 TABLE DATA extensions other postgres",
  "4523; 0 0 SEQUENCE SET auth refresh_tokens_id_seq supabase_auth_admin",
  "312; 1259 17211 TABLE public accounts postgres",
].join("\n");

describe("dataEntries", () => {
  const entries = dataEntries(TOC);

  it("keeps rows and sequences of public and auth, minus auth.schema_migrations", () => {
    expect(entries.map((e) => `${e.kind} ${e.schema}.${e.name}`)).toEqual([
      "TABLE DATA auth.refresh_tokens",
      "TABLE DATA auth.users",
      "TABLE DATA public._migrations",
      "TABLE DATA public.accounts",
      "SEQUENCE SET auth.refresh_tokens_id_seq",
    ]);
  });

  it("lists dumped tables per schema", () => {
    expect(dumpedTables(entries, "auth")).toEqual(["refresh_tokens", "users"]);
  });

  it("lists dumped sequences per schema", () => {
    expect(dumpedSequences(entries, "auth")).toEqual(["refresh_tokens_id_seq"]);
  });

  it("drops objects the target lacks, in that schema only", () => {
    const kept = withoutObjects(entries, "auth", ["refresh_tokens", "refresh_tokens_id_seq"]);
    expect(kept.map((e) => `${e.schema}.${e.name}`)).toEqual(["auth.users", "public._migrations", "public.accounts"]);
  });

  it("reuses the original lines for --use-list", () => {
    expect(restoreList(entries).split("\n")[0]).toBe("4436; 0 16470 TABLE DATA auth refresh_tokens supabase_auth_admin");
  });
});

describe("stripUnsupportedSettings", () => {
  const sql = "SET lock_timeout = 0;\nSET transaction_timeout = 0;\nSET client_encoding = 'UTF8';\n";

  it("drops transaction_timeout for servers older than 17", () => {
    expect(stripUnsupportedSettings(sql, 15)).toBe("SET lock_timeout = 0;\nSET client_encoding = 'UTF8';\n");
  });

  it("leaves the script alone on 17+", () => {
    expect(stripUnsupportedSettings(sql, 17)).toBe(sql);
  });
});

describe("copyRowCount", () => {
  it("counts rows across COPY blocks", () => {
    const end = "\\.";
    const sql = ["SET x = 1;", "COPY auth.a (id) FROM stdin;", "1", "2", end, "", "COPY auth.b (id) FROM stdin;", end, "COPY auth.c (id) FROM stdin;", "3", end].join("\n");
    expect(copyRowCount(sql)).toBe(3);
  });

  it("is zero without data", () => {
    expect(copyRowCount("SET x = 1;\n")).toBe(0);
  });
});
