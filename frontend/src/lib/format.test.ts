import { describe, expect, it } from "vitest";

import { ApiRequestError } from "./api/http";
import { errorMessage, formatNumber, formatPercent, pluralize, shortId } from "./format";

describe("format helpers", () => {
  it("formats rates as whole percentages and null as N/A", () => {
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.666)).toBe("67%");
    expect(formatPercent(null)).toBe("N/A");
  });

  it("keeps integers plain and rounds fractions to two places", () => {
    expect(formatNumber(3)).toBe("3");
    expect(formatNumber(3.5)).toBe("3.50");
    expect(formatNumber(null)).toBe("N/A");
  });

  it("shortens backend run ids but leaves other ids alone", () => {
    expect(shortId("run-8ed1a0f3-f2a3-46c0-b362-a763685e177a")).toBe("run-8ed1a0f3");
    expect(shortId("custom")).toBe("custom");
  });

  it("pluralizes", () => {
    expect(pluralize(1, "road")).toBe("1 road");
    expect(pluralize(2, "road")).toBe("2 roads");
    expect(pluralize(0, "place")).toBe("0 places");
  });

  it("prefers the API error message, then Error, then the fallback", () => {
    expect(errorMessage(new ApiRequestError("Capacity too low", 409, "CONFLICT"), "x")).toBe("Capacity too low");
    expect(errorMessage(new Error("boom"), "x")).toBe("boom");
    expect(errorMessage("weird", "fallback")).toBe("fallback");
  });
});
