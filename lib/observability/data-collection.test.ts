import { describe, expect, it } from "vitest";
import { DATA_COLLECTION } from "./data-collection";

describe("DATA_COLLECTION", () => {
  it("collects no user, cookie, body, query, database or frame data", () => {
    expect(DATA_COLLECTION).toMatchObject({
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    });
  });

  it("keeps only the user-agent request header", () => {
    expect(DATA_COLLECTION.httpHeaders).toEqual({ request: { allow: ["user-agent"] }, response: false });
  });
});
