import type { RunDetail, RunMetrics } from "./api/types";
import { formatNumber, formatPercent } from "./format";
import { METRIC_HELP, type MetricKey } from "./labels";

export type Verdict = "same" | "better" | "worse" | "differs" | "na";

export type ComparisonRow = {
  key: MetricKey;
  label: string;
  unit: string;
  help: string;
  a: string;
  b: string;
  /** Verdict describes run B relative to run A. */
  verdict: Verdict;
};

type Spec = { key: MetricKey; read: (metrics: RunMetrics) => number | null; format: (value: number | null) => string };

const integer = (value: number | null): string => (value === null ? "N/A" : String(value));

const SPECS: Spec[] = [
  { key: "incident_coverage_rate", read: (m) => m.incident_coverage_rate, format: formatPercent },
  { key: "medical_assignment_coverage", read: (m) => m.medical_assignment_coverage, format: formatPercent },
  { key: "shelter_fulfillment_rate", read: (m) => m.shelter_fulfillment_rate, format: formatPercent },
  { key: "kit_fulfillment_rate", read: (m) => m.kit_fulfillment_rate, format: formatPercent },
  { key: "unmet_demand_total", read: (m) => m.unmet_demand_total, format: integer },
  { key: "mean_assigned_route_cost", read: (m) => m.mean_assigned_route_cost, format: (v) => formatNumber(v) },
  { key: "constraint_violation_count", read: (m) => m.constraint_violation_count, format: integer },
  { key: "replan_count", read: (m) => m.replan_count, format: integer },
  { key: "coordinator_steps", read: (m) => m.coordinator_steps, format: integer },
];

const EPSILON = 1e-9;

export function judge(a: number | null, b: number | null, better: "higher" | "lower" | "info"): Verdict {
  if (a === null || b === null) return a === b ? "same" : "na";
  if (Math.abs(a - b) < EPSILON) return "same";
  if (better === "info") return "differs";
  return (better === "higher" ? b > a : b < a) ? "better" : "worse";
}

export function buildComparisonRows(a: RunDetail, b: RunDetail): ComparisonRow[] {
  return SPECS.map((spec) => {
    const info = METRIC_HELP[spec.key];
    const valueA = spec.read(a.metrics);
    const valueB = spec.read(b.metrics);
    return {
      key: spec.key,
      label: info.label,
      unit: info.unit,
      help: info.help,
      a: spec.format(valueA),
      b: spec.format(valueB),
      verdict: judge(valueA, valueB, info.better),
    };
  });
}

/** Which incidents received a medical unit. Same totals can hide different choices. */
export function medicalRecipients(run: RunDetail): string[] {
  return [...new Set(run.state.medical_assignments.map((item) => item.incident_id))].sort();
}

/** Extra caveats the backend's comparability check does not cover. */
export function comparisonCaveats(a: RunDetail, b: RunDetail): string[] {
  const caveats: string[] = [];
  if (a.metrics.replan_count !== b.metrics.replan_count) {
    caveats.push(
      `The runs applied different numbers of disruptions (${a.metrics.replan_count} vs ${b.metrics.replan_count}), so they ended in different conditions.`,
    );
  }
  if (a.run_id === b.run_id) {
    caveats.push("You selected the same run twice.");
  }
  return caveats;
}
