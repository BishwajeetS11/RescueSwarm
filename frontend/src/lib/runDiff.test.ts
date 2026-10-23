import { describe, expect, it } from "vitest";

import { makeRun, metrics } from "../test/fixtures";
import { summarizeRunChange } from "./runDiff";

describe("summarizeRunChange", () => {
  it("reports no route changes for identical snapshots", () => {
    const run = makeRun();
    const change = summarizeRunChange(run, run);
    expect(change.routeChanges).toEqual([]);
    expect(change.assignmentsBefore).toBe(3);
    expect(change.assignmentsAfter).toBe(3);
  });

  it("detects rerouted medical and kit assignments", () => {
    const before = makeRun();
    const after = makeRun({
      metrics: { ...metrics, unmet_demand_total: 1, replan_count: 1 },
      state: {
        ...before.state,
        medical_assignments: [{ unit_id: "med-1", incident_id: "inc-1", route: ["n-a", "n-c", "n-b"], route_cost: 6 }],
        supply_assignments: [],
      },
    });
    const change = summarizeRunChange(before, after);
    expect(change.routeChanges).toHaveLength(2);
    const medical = change.routeChanges.find((item) => item.kind === "medical")!;
    expect(medical.before).toEqual(["n-a", "n-b"]);
    expect(medical.after).toEqual(["n-a", "n-c", "n-b"]);
    const supply = change.routeChanges.find((item) => item.kind === "supply")!;
    expect(supply.after).toBeNull();
    expect(change.assignmentsAfter).toBe(2);
    expect(change.unmetAfter).toBe(1);
  });
});
