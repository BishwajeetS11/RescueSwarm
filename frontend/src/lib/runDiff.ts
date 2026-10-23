import type { RunDetail } from "./api/types";

export type RouteChange = {
  incidentId: string;
  kind: "medical" | "supply";
  before: string[] | null;
  after: string[] | null;
};

export type RunChange = {
  routeChanges: RouteChange[];
  assignmentsBefore: number;
  assignmentsAfter: number;
  unmetBefore: number;
  unmetAfter: number;
  statusBefore: string;
  statusAfter: string;
};

function routesByKey(
  items: { incident_id: string; route: string[]; unit_id?: string; stock_id?: string }[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    map.set(`${item.incident_id}|${item.unit_id ?? item.stock_id ?? ""}`, item.route);
  }
  return map;
}

function sameRoute(a: string[] | null, b: string[] | null): boolean {
  return a !== null && b !== null && a.length === b.length && a.every((node, index) => node === b[index]);
}

function diffKind(
  kind: RouteChange["kind"],
  before: Map<string, string[]>,
  after: Map<string, string[]>,
): RouteChange[] {
  const keys = new Set([...before.keys(), ...after.keys()]);
  const changes: RouteChange[] = [];
  for (const key of [...keys].sort()) {
    const previous = before.get(key) ?? null;
    const next = after.get(key) ?? null;
    if (!sameRoute(previous, next)) {
      changes.push({ incidentId: key.split("|")[0] ?? key, kind, before: previous, after: next });
    }
  }
  return changes;
}

/** Display-only comparison of two snapshots of the same run (before/after a disruption). */
export function summarizeRunChange(before: RunDetail, after: RunDetail): RunChange {
  const count = (run: RunDetail) =>
    run.state.medical_assignments.length +
    run.state.shelter_assignments.length +
    run.state.supply_assignments.length;
  return {
    routeChanges: [
      ...diffKind(
        "medical",
        routesByKey(before.state.medical_assignments),
        routesByKey(after.state.medical_assignments),
      ),
      ...diffKind(
        "supply",
        routesByKey(before.state.supply_assignments),
        routesByKey(after.state.supply_assignments),
      ),
    ],
    assignmentsBefore: count(before),
    assignmentsAfter: count(after),
    unmetBefore: before.metrics.unmet_demand_total,
    unmetAfter: after.metrics.unmet_demand_total,
    statusBefore: before.status,
    statusAfter: after.status,
  };
}
