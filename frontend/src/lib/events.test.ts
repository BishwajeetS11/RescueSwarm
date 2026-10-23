import { describe, expect, it } from "vitest";

import { makeEvent, scenario } from "../test/fixtures";
import { describeEvent, latestPriorities } from "./events";

const nodes = scenario.nodes;

describe("describeEvent", () => {
  it("describes medical assignments with route labels and cost", () => {
    const event = makeEvent({
      sequence: 3,
      event_type: "allocation_committed",
      payload: {
        action: { kind: "assign_medical", incident_id: "inc-1", unit_id: "med-1", route: ["n-a", "n-b"], route_cost: 2 },
      },
    });
    expect(describeEvent(event, nodes)).toBe("Sent medical unit med-1 to inc-1 via Base → Site (cost 2)");
  });

  it("describes unserved incidents with the unmet amount", () => {
    const event = makeEvent({
      sequence: 4,
      event_type: "incident_unserved",
      payload: { action: { kind: "mark_unserved", incident_id: "inc-2", category: "medical", unmet: 2 } },
    });
    expect(describeEvent(event, nodes)).toBe("Could not fully serve medical demand at inc-2 (2 unmet)");
  });

  it("uses road labels for disruptions when edges are known", () => {
    const event = makeEvent({
      sequence: 5,
      event_type: "disruption_applied",
      payload: { type: "close_edge", edge_id: "e1" },
    });
    expect(describeEvent(event, nodes, scenario.edges)).toBe("You closed road Base → Site");
    expect(describeEvent(event, nodes)).toBe("You closed road e1");
  });

  it("includes the validator reason for rejected proposals", () => {
    const event = makeEvent({
      sequence: 6,
      event_type: "proposal_rejected",
      status: "rejected",
      payload: {
        action: { kind: "assign_medical", incident_id: "inc-1", unit_id: "med-1" },
        errors: [{ field: "route", issue: "route uses a closed road", code: "EDGE_CLOSED" }],
      },
    });
    expect(describeEvent(event, nodes)).toContain("Reason: route uses a closed road");
  });

  it("falls back safely for unknown payloads", () => {
    const event = makeEvent({ sequence: 7, event_type: "allocation_committed", payload: { action: "oops" } });
    expect(describeEvent(event, nodes)).toBe("Committed an allocation");
  });
});

describe("latestPriorities", () => {
  it("returns the most recent scores and ignores malformed values", () => {
    const events = [
      makeEvent({ sequence: 1, event_type: "priority_computed", payload: { priorities: { "inc-1": 0.2 } } }),
      makeEvent({ sequence: 2, event_type: "priority_computed", payload: { priorities: { "inc-1": 0.7, bad: "x" } } }),
    ];
    expect(latestPriorities(events)).toEqual({ "inc-1": 0.7 });
    expect(latestPriorities([])).toEqual({});
  });
});
