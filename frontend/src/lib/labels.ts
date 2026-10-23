import type { NodeKind } from "./api/types";

/** Presentation-only copy. No behavior or metric is decided here. */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export const DEMO_SCENARIO_ID = "scenario-routes-1";

export const STRATEGIES = {
  rescueswarm: {
    label: "RescueSwarm",
    summary: "Priority-aware multi-agent planner",
    description:
      "Ranks incidents by urgency, people affected, time sensitivity and access risk, then lets specialist agents propose assignments that a validator checks.",
  },
  baseline: {
    label: "Baseline",
    summary: "Input-order planner",
    description:
      "Serves incidents in the order they are listed and picks the first feasible unit by id. A simple reference policy to compare against.",
  },
} as const;

export type StrategyKey = keyof typeof STRATEGIES;

export function otherStrategy(strategy: StrategyKey): StrategyKey {
  return strategy === "rescueswarm" ? "baseline" : "rescueswarm";
}

export function strategyLabel(strategy: string): string {
  return strategy in STRATEGIES ? STRATEGIES[strategy as StrategyKey].label : strategy;
}

type StatusInfo = { label: string; tone: Tone };

const RUN_STATUS: Record<string, StatusInfo> = {
  completed: { label: "Completed", tone: "success" },
  infeasible: { label: "Infeasible", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  running: { label: "Running", tone: "info" },
  created: { label: "Created", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export function runStatusInfo(status: string): StatusInfo {
  return RUN_STATUS[status] ?? { label: status, tone: "neutral" };
}

const INCIDENT_STATUS: Record<string, StatusInfo> = {
  assigned: { label: "Fully served", tone: "success" },
  partially_assigned: { label: "Partly served", tone: "warning" },
  unserved: { label: "Unserved", tone: "danger" },
  pending: { label: "Pending", tone: "neutral" },
};

export function incidentStatusInfo(status: string): StatusInfo {
  return INCIDENT_STATUS[status] ?? { label: status, tone: "neutral" };
}

const EVENT_STATUS: Record<string, StatusInfo> = {
  success: { label: "Success", tone: "success" },
  warning: { label: "Warning", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  info: { label: "Info", tone: "info" },
};

export function eventStatusInfo(status: string): StatusInfo {
  return EVENT_STATUS[status] ?? { label: status, tone: "neutral" };
}

export const EVENT_STATUS_ORDER = ["success", "warning", "rejected", "failed", "info"] as const;

const ACTORS: Record<string, string> = {
  coordinator: "Coordinator",
  prioritizer: "Prioritizer",
  route_planner: "Route planner",
  medical_dispatch: "Medical dispatch",
  shelter_allocator: "Shelter allocator",
  supply_allocator: "Supply allocator",
  constraint_validator: "Constraint validator",
  explanation: "Explanation",
  user: "You",
  interpreter: "Interpreter",
};

export function actorLabel(actor: string): string {
  return ACTORS[actor] ?? actor;
}

const NODE_KINDS: Record<NodeKind, string> = {
  incident_site: "Incident site",
  resource_base: "Resource base",
  shelter: "Shelter",
  junction: "Junction",
  supply_depot: "Supply depot",
  mixed: "Mixed site",
};

export function nodeKindLabel(kind: NodeKind): string {
  return NODE_KINDS[kind];
}

const SCENARIO_FOCUS: Record<string, { focus: string; tone: Tone }> = {
  "scenario-routes-1": { focus: "Road disruption", tone: "info" },
  "scenario-balanced-1": { focus: "Balanced demand", tone: "success" },
  "scenario-disconnected-1": { focus: "Unreachable site", tone: "danger" },
  "scenario-shortage-1": { focus: "Medical shortage", tone: "warning" },
  "scenario-shelter-1": { focus: "Shelter shortage", tone: "warning" },
  "scenario-supply-1": { focus: "Aid-kit shortage", tone: "warning" },
};

export function scenarioFocus(id: string): { focus: string; tone: Tone } {
  return SCENARIO_FOCUS[id] ?? { focus: "Custom scenario", tone: "neutral" };
}

const COMPARE_DIFFERENCES: Record<string, string> = {
  scenario_hash: "The scenarios differ, so results answer different questions.",
  seed: "The seeds differ.",
  strategy: "The planning strategies differ. This is the variable you are comparing.",
  algorithm_version: "The algorithm versions differ.",
  metric_schema_version: "The metric definitions differ.",
};

export function describeDifference(code: string): string {
  return COMPARE_DIFFERENCES[code] ?? code;
}

export type MetricKey =
  | "incident_coverage_rate"
  | "medical_assignment_coverage"
  | "shelter_fulfillment_rate"
  | "kit_fulfillment_rate"
  | "unmet_demand_total"
  | "mean_assigned_route_cost"
  | "constraint_violation_count"
  | "replan_count"
  | "coordinator_steps";

export const METRIC_HELP: Record<MetricKey, { label: string; unit: string; help: string; better: "higher" | "lower" | "info" }> = {
  incident_coverage_rate: {
    label: "Incident coverage",
    unit: "% of incidents",
    help: "Share of incidents that received at least one assignment (medical unit, shelter seats or kits). Partial help counts, so read it with unmet demand.",
    better: "higher",
  },
  medical_assignment_coverage: {
    label: "Medical coverage",
    unit: "% of units requested",
    help: "Medical units assigned divided by medical units requested across all incidents.",
    better: "higher",
  },
  shelter_fulfillment_rate: {
    label: "Shelter fulfilled",
    unit: "% of people",
    help: "People given a shelter place divided by total shelter demand. Capacity is a hard limit checked by the validator.",
    better: "higher",
  },
  kit_fulfillment_rate: {
    label: "Aid kits delivered",
    unit: "% of kits",
    help: "Kits delivered divided by kits requested. Depot stock is a hard limit.",
    better: "higher",
  },
  unmet_demand_total: {
    label: "Unmet demand",
    unit: "units (mixed)",
    help: "Medical units + shelter seats + kits still missing. It adds different resource types, so use it for before/after comparison, not as a real-world score.",
    better: "lower",
  },
  mean_assigned_route_cost: {
    label: "Mean route cost",
    unit: "abstract cost units",
    help: "Average synthetic edge cost of assigned medical routes. It is not minutes or kilometres.",
    better: "lower",
  },
  constraint_violation_count: {
    label: "Constraint violations",
    unit: "count",
    help: "Hard-rule breaches found by an independent check of the committed plan (capacity, closed roads, double assignment). The target is always 0.",
    better: "lower",
  },
  replan_count: {
    label: "Replans",
    unit: "count",
    help: "How many times the plan was recomputed after a disruption you applied.",
    better: "info",
  },
  coordinator_steps: {
    label: "Coordinator steps",
    unit: "steps (max 10)",
    help: "Planning rounds the coordinator used before nothing more could be assigned. The loop is bounded.",
    better: "info",
  },
};
