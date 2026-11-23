import { describe, expect, it } from "vitest";
import { loadScript, qualified } from "./load-script.ts";

describe("qualified", () => {
  it("quotes identifiers", () => {
    expect(qualified("public", 'we"ird')).toBe('"public"."we""ird"');
  });
});

describe("loadScript", () => {
  it("clears and loads in one transaction with triggers off", () => {
    const script = loadScript(['"public"."accounts"', '"auth"."users"'], "C:\\tmp\\it's\\data.sql");
    expect(script.split("\n")).toEqual([
      "\\set ON_ERROR_STOP on",
      "begin;",
      "set local session_replication_role = replica;",
      'delete from "public"."accounts";',
      'delete from "auth"."users";',
      "\\i 'C:/tmp/it''s/data.sql'",
      "commit;",
      "",
    ]);
  });
});
