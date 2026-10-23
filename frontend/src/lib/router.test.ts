import { describe, expect, it } from "vitest";

import { href, parseHash } from "./router";

describe("router", () => {
  it("parses the known routes", () => {
    expect(parseHash("")).toEqual({ name: "home" });
    expect(parseHash("#/about")).toEqual({ name: "about" });
    expect(parseHash("#/scenarios/new")).toEqual({ name: "create" });
    expect(parseHash("#/scenarios/abc")).toEqual({ name: "scenario", id: "abc" });
    expect(parseHash("#/runs/run-1")).toEqual({ name: "run", id: "run-1" });
  });

  it("reads run ids from the compare query string", () => {
    expect(parseHash("#/compare")).toEqual({ name: "compare" });
    expect(parseHash("#/compare?a=run-1&b=run-2")).toEqual({ name: "compare", a: "run-1", b: "run-2" });
    expect(parseHash("#/compare?b=run-2")).toEqual({ name: "compare", b: "run-2" });
  });

  it("round-trips compare links", () => {
    const route = { name: "compare", a: "run-1", b: "run-2" } as const;
    expect(parseHash(href(route))).toEqual(route);
    expect(href({ name: "compare" })).toBe("#/compare");
  });

  it("falls back to home for unknown paths", () => {
    expect(parseHash("#/nope/else")).toEqual({ name: "home" });
  });
});
