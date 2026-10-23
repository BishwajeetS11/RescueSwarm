export type ScenarioSummary = {
  id: string;
  name: string;
  description: string;
  incident_count: number;
  node_count: number;
  medical_unit_count: number;
  bundled: boolean;
};

export type NodeKind =
  | "incident_site"
  | "resource_base"
  | "shelter"
  | "junction"
  | "supply_depot"
  | "mixed";

export type ScenarioNode = { id: string; label: string; kind: NodeKind };
export type ScenarioEdge = {
  id: string;
  source: string;
  target: string;
  cost: number;
  available: boolean;
};
export type Incident = {
  id: string;
  label: string;
  node_id: string;
  category: string;
  urgency: number;
  people_affected: number;
  time_sensitivity: number;
  access_risk: number;
  medical_units_required: number;
  kits_required: number;
  shelter_demand: number;
  status: string;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  schema_version: number;
  graph_directed: boolean;
  allow_shelter_split: boolean;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  incidents: Incident[];
  medical_units: { id: string; node_id: string; available: boolean }[];
  shelters: {
    id: string;
    node_id: string;
    capacity: number;
    used_capacity: number;
    enabled: boolean;
  }[];
  supply_stocks: { id: string; node_id: string; kits_available: number }[];
};

export type RunMetrics = {
  incidents_total: number;
  incidents_with_any_assignment: number;
  incident_coverage_rate: number | null;
  medical_units_requested: number;
  medical_units_used: number;
  medical_assignment_coverage: number | null;
  shelter_demand_total: number;
  shelter_demand_fulfilled: number;
  shelter_fulfillment_rate: number | null;
  kits_requested: number;
  kits_delivered: number;
  kit_fulfillment_rate: number | null;
  mean_assigned_route_cost: number | null;
  unmet_medical: number;
  unmet_shelter: number;
  unmet_kits: number;
  unmet_demand_total: number;
  constraint_violation_count: number;
  replan_count: number;
  coordinator_steps: number;
};

export type RunSummary = {
  run_id: string;
  status: string;
  scenario_id: string;
  strategy: "rescueswarm" | "baseline";
  seed: number;
  metrics: RunMetrics;
  event_count: number;
  llm_mode: string;
  disclaimer: string;
  created_at: string;
  completed_at: string | null;
  algorithm_version: string;
  metric_schema_version: string;
};

export type RunEvent = {
  event_id: string;
  run_id: string;
  sequence: number;
  timestamp: string;
  actor: string;
  event_type: string;
  status: string;
  reason_codes: string[];
  payload: Record<string, unknown>;
};

export type RunDetail = RunSummary & {
  scenario: Scenario;
  state: {
    edges: ScenarioEdge[];
    incidents: Incident[];
    medical_units: Record<string, unknown>[];
    shelters: Scenario["shelters"];
    supply_stocks: Scenario["supply_stocks"];
    medical_assignments: { unit_id: string; incident_id: string; route: string[]; route_cost: number }[];
    shelter_assignments: { shelter_id: string; incident_id: string; people: number }[];
    supply_assignments: { stock_id: string; incident_id: string; kits: number; route: string[] }[];
    unmet_medical: Record<string, number>;
    unmet_shelter: Record<string, number>;
    unmet_kits: Record<string, number>;
  };
  explanation: string | null;
  explanation_source: string;
};

export type DisruptionRequest =
  | { type: "close_edge" | "open_edge"; edge_id: string; reason?: string }
  | { type: "reduce_shelter_capacity"; shelter_id: string; new_capacity: number; reason?: string };

export type DisruptionResponse = {
  run: RunDetail;
  replan_status: string;
  new_event_count: number;
};

export type Comparability = { comparable: boolean; differences: string[] };

export type CompareResponse = { items: RunDetail[]; comparability: Comparability };

export type ParseTextResponse = {
  draft: Record<string, unknown>;
  needs_review: boolean;
  warnings: string[];
  parser_mode: string;
  missing_fields: string[];
  fallback_used: boolean;
};

export type ApiError = {
  error: { code: string; message: string; details: { field: string; issue: string }[] };
};
