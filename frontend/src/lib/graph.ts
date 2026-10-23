import type { RunDetail, ScenarioEdge, ScenarioNode } from "./api/types";

export type Point = { x: number; y: number };

const KIND_ORDER: Record<string, number> = {
  resource_base: 0,
  supply_depot: 1,
  shelter: 2,
  mixed: 3,
  junction: 4,
  incident_site: 5,
};

export function nodeLabel(nodes: ScenarioNode[], id: string): string {
  return nodes.find((node) => node.id === id)?.label ?? id;
}

export function describeEdge(nodes: ScenarioNode[], edge: ScenarioEdge): string {
  return `${nodeLabel(nodes, edge.source)} → ${nodeLabel(nodes, edge.target)}`;
}

export function describeRoute(nodes: ScenarioNode[], route: string[]): string {
  return route.length === 0 ? "no route" : route.map((id) => nodeLabel(nodes, id)).join(" → ");
}

/**
 * Places nodes on an ellipse, grouped by kind so bases, depots and shelters sit
 * together and incident sites sit together. Deterministic for a given input.
 */
export function layoutNodes(
  nodes: ScenarioNode[],
  width: number,
  height: number,
  margin = 70,
): Map<string, Point & { angle: number }> {
  const ordered = [...nodes].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || a.id.localeCompare(b.id),
  );
  // Side margins are larger than top/bottom because node names are drawn to the left/right of nodes.
  const rx = width / 2 - margin * 2.1;
  const ry = height / 2 - margin * 0.8;
  const positions = new Map<string, Point & { angle: number }>();
  ordered.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / Math.max(ordered.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: width / 2 + rx * Math.cos(angle),
      y: height / 2 + ry * Math.sin(angle),
      angle,
    });
  });
  return positions;
}

export type CurvedEdge = { path: string; label: Point };

/**
 * A quadratic curve bowed to the left of travel direction. A reverse edge
 * therefore bows to the other side, so both directions stay visible and
 * individually selectable. Ends are pulled back by `inset` for arrowheads.
 */
export function curvedEdge(from: Point, to: Point, inset: number): CurvedEdge {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bow = Math.min(34, length * 0.14);
  const control = { x: (from.x + to.x) / 2 + nx * bow * 2, y: (from.y + to.y) / 2 + ny * bow * 2 };
  const towards = (origin: Point, target: Point): Point => {
    const vx = target.x - origin.x;
    const vy = target.y - origin.y;
    const size = Math.hypot(vx, vy) || 1;
    return { x: origin.x + (vx / size) * inset, y: origin.y + (vy / size) * inset };
  };
  const start = towards(from, control);
  const end = towards(to, control);
  return {
    path: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    label: {
      x: 0.25 * from.x + 0.5 * control.x + 0.25 * to.x,
      y: 0.25 * from.y + 0.5 * control.y + 0.25 * to.y,
    },
  };
}

export function routeEdgeKeys(routes: string[][]): Set<string> {
  const keys = new Set<string>();
  for (const route of routes) {
    route.slice(0, -1).forEach((node, index) => {
      const next = route[index + 1];
      if (next !== undefined) keys.add(`${node}->${next}`);
    });
  }
  return keys;
}

export function edgeKey(edge: Pick<ScenarioEdge, "source" | "target">): string {
  return `${edge.source}->${edge.target}`;
}

export type EdgeUsage = {
  medical: { unitId: string; incidentId: string }[];
  supply: { stockId: string; incidentId: string }[];
};

/** Which committed routes in the current plan travel along this directed edge? */
export function routesUsingEdge(run: RunDetail, edge: ScenarioEdge): EdgeUsage {
  const key = edgeKey(edge);
  return {
    medical: run.state.medical_assignments
      .filter((item) => routeEdgeKeys([item.route]).has(key))
      .map((item) => ({ unitId: item.unit_id, incidentId: item.incident_id })),
    supply: run.state.supply_assignments
      .filter((item) => routeEdgeKeys([item.route]).has(key))
      .map((item) => ({ stockId: item.stock_id, incidentId: item.incident_id })),
  };
}
