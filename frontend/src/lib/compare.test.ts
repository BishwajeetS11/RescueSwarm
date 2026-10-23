import { describe, expect, it } from "vitest";

import { makeRun, metrics } from "../test/fixtures";
import { buildComparisonRows, comparisonCaveats, judge, medicalRecipients } from "./compare";

describe("judge", () => {
  it("treats higher coverage and lower unmet demand as better for run B", () => {
    expect(judge(0.5, 1, "higher")).toBe("better");
    expect(judge(1, 0.5, "higher")).toBe("worse");
    expect(judge(4, 2, "lower")).toBe("better");
    expect(judge(2, 4, "lower")).toBe("worse");
  });

  it("reports same, differs and not-comparable cases", () => {
    expect(judge(1, 1, "higher")).toBe("same");
    expect(judge(1, 2, "info")).toBe("differs");
    expect(judge(null, null, "higher")).toBe("same");
    expect(judge(null, 1, "higher")).toBe("na");
  });
});

describe("buildComparisonRows", () => {
  it("formats values and attaches a verdict per metric", () => {
    const a = makeRun({ metrics: { ...metrics, unmet_demand_total: 4, incident_coverage_rate: 0.5 } });
    const b = makeRun({ run_id: "run-bbbbbbbb-0000-0000-0000-000000000000" });
    const rows = buildComparisonRows(a, b);
    const coverage = rows.find((row) => row.key === "incident_coverage_rate")!;
    const unmet = rows.find((row) => row.key === "unmet_demand_total")!;
    expect(coverage).toMatchObject({ a: "50%", b: "100%", verdict: "better" });
    expect(unmet).toMatchObject({ a: "4", b: "0", verdict: "better" });
    expect(rows.find((row) => row.key === "constraint_violation_count")?.verdict).toBe("same");
  });
});

describe("caveats and recipients", () => {
  it("warns when disruption histories differ or the same run is picked twice", () => {
    const a = makeRun();
    const b = makeRun({ run_id: "run-bbbbbbbb-0000-0000-0000-000000000000", metrics: { ...metrics, replan_count: 2 } });
    expect(comparisonCaveats(a, b)[0]).toContain("0 vs 2");
    expect(comparisonCaveats(a, a)).toContain("You selected the same run twice.");
    expect(comparisonCaveats(a, makeRun({ run_id: "run-bbbbbbbb-0000-0000-0000-000000000000" }))).toEqual([]);
  });

  it("lists which incidents received a medical unit", () => {
    expect(medicalRecipients(makeRun())).toEqual(["inc-1"]);
  });
});
