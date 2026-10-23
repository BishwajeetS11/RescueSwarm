import type { Incident, RunDetail, RunEvent, RunMetrics, Scenario } from "../lib/api/types";

/** Small deterministic fixtures. They are hand-written test data, not backend output. */

export const incident: Incident = {
  id: "inc-1",
  label: "Flooded block",
  node_id: "n-b",
  category: "flood",
  urgency: 4,
  people_affected: 12,
  time_sensitivity: 0.7,
  access_risk: 0.4,
  medical_units_required: 1,
  kits_required: 4,
  shelter_demand: 6,
  status: "assigned",
};

export const scenario: Scenario = {
  id: "scenario-test-1",
  name: "Test network",
  description: "Fixture scenario",
  schema_version: 1,
  graph_directed: true,
  allow_shelter_split: false,
  nodes: [
    { id: "n-a", label: "Base", kind: "resource_base" },
    { id: "n-b", label: "Site", kind: "incident_site" },
    { id: "n-c", label: "Junction", kind: "junction" },
    { id: "n-s", label: "Shelter", kind: "shelter" },
  ],
  edges: [
    { id: "e1", source: "n-a", target: "n-b", cost: 2, available: true },
    { id: "e2", source: "n-b", target: "n-a", cost: 2, available: true },
    { id: "e3", source: "n-a", target: "n-c", cost: 3, available: true },
    { id: "e4", source: "n-c", target: "n-b", cost: 3, available: false },
  ],
  incidents: [incident],
  medical_units: [{ id: "med-1", node_id: "n-a", available: true }],
  shelters: [{ id: "sh-1", node_id: "n-s", capacity: 10, used_capacity: 0, enabled: true }],
  supply_stocks: [{ id: "stock-1", node_id: "n-a", kits_available: 8 }],
};

export const metrics: RunMetrics = {
  incidents_total: 1,
  incidents_with_any_assignment: 1,
  incident_coverage_rate: 1,
  medical_units_requested: 1,
  medical_units_used: 1,
  medical_assignment_coverage: 1,
  shelter_demand_total: 6,
  shelter_demand_fulfilled: 6,
  shelter_fulfillment_rate: 1,
  kits_requested: 4,
  kits_delivered: 4,
  kit_fulfillment_rate: 1,
  mean_assigned_route_cost: 2,
  unmet_medical: 0,
  unmet_shelter: 0,
  unmet_kits: 0,
  unmet_demand_total: 0,
  constraint_violation_count: 0,
  replan_count: 0,
  coordinator_steps: 1,
};

export function makeRun(overrides: Partial<RunDetail> = {}): RunDetail {
  return {
    run_id: "run-aaaaaaaa-0000-0000-0000-000000000000",
    status: "completed",
    scenario_id: scenario.id,
    strategy: "rescueswarm",
    seed: 42,
    metrics,
    event_count: 3,
    llm_mode: "mock",
    disclaimer: "fixture",
    created_at: "2026-10-22T10:00:00Z",
    completed_at: "2026-10-22T10:00:01Z",
    algorithm_version: "alloc-v1",
    metric_schema_version: "metrics-v1",
    scenario,
    state: {
      edges: scenario.edges,
      incidents: [incident],
      medical_units: [{ id: "med-1", node_id: "n-a", status: "assigned", assigned_incident_id: "inc-1" }],
      shelters: [{ ...scenario.shelters[0]!, used_capacity: 6 }],
      supply_stocks: [{ id: "stock-1", node_id: "n-a", kits_available: 4 }],
      medical_assignments: [{ unit_id: "med-1", incident_id: "inc-1", route: ["n-a", "n-b"], route_cost: 2 }],
      shelter_assignments: [{ shelter_id: "sh-1", incident_id: "inc-1", people: 6 }],
      supply_assignments: [{ stock_id: "stock-1", incident_id: "inc-1", kits: 4, route: ["n-a", "n-b"] }],
      unmet_medical: {},
      unmet_shelter: {},
      unmet_kits: {},
    },
    explanation: null,
    explanation_source: "none",
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<RunEvent> & Pick<RunEvent, "sequence">): RunEvent {
  return {
    event_id: `evt-${overrides.sequence}`,
    run_id: "run-aaaaaaaa-0000-0000-0000-000000000000",
    timestamp: "2026-10-22T10:00:00Z",
    actor: "coordinator",
    event_type: "run_started",
    status: "info",
    reason_codes: [],
    payload: {},
    ...overrides,
  };
}
