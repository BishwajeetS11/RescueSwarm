import { describe, expect, it } from "vitest";

import { HealthRequestError, parseHealthResponse } from "./health";

describe("parseHealthResponse", () => {
  it("accepts the documented schema", () => {
    expect(parseHealthResponse({ status: "ok", service: "rescueswarm-api" })).toEqual({
      status: "ok",
      service: "rescueswarm-api",
    });
  });

  it("rejects payloads that omit required fields", () => {
    expect(() => parseHealthResponse({ status: "ok" })).toThrow(HealthRequestError);
  });
});
