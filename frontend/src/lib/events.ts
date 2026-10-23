import type { RunEvent, ScenarioEdge, ScenarioNode } from "./api/types";
import { describeEdge, describeRoute } from "./graph";

type Rec = Record<string, unknown>;

function asRecord(value: unknown): Rec | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Rec) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function describeAction(action: Rec, nodes: ScenarioNode[]): string {
  const incident = str(action.incident_id) ?? "an incident";
  const route = strList(action.route);
  const routeText = route.length > 0 ? ` via ${describeRoute(nodes, route)}` : "";
  switch (str(action.kind)) {
    case "assign_medical":
      return `Sent medical unit ${str(action.unit_id) ?? "?"} to ${incident}${routeText}${costText(action)}`;
    case "assign_shelter":
      return `Placed ${num(action.people) ?? "?"} people from ${incident} in shelter ${str(action.shelter_id) ?? "?"}`;
    case "assign_supply":
      return `Sent ${num(action.kits) ?? "?"} kits from ${str(action.stock_id) ?? "?"} to ${incident}${routeText}`;
    case "mark_unserved": {
      const category = str(action.category);
      const unmet = num(action.unmet);
      const what = category ? ` ${category}` : "";
      return `Could not fully serve${what} demand at ${incident}${unmet !== null ? ` (${unmet} unmet)` : ""}`;
    }
    default:
      return `Proposed an action for ${incident}`;
  }
}

function costText(action: Rec): string {
  const cost = num(action.route_cost);
  return cost !== null && cost > 0 ? ` (cost ${cost})` : "";
}

function describeDisruption(payload: Rec, nodes: ScenarioNode[], edges: ScenarioEdge[]): string {
  const edgeId = str(payload.edge_id);
  const edge = edges.find((item) => item.id === edgeId);
  const road = edge ? describeEdge(nodes, edge) : (edgeId ?? "?");
  switch (str(payload.type)) {
    case "close_edge":
      return `You closed road ${road}`;
    case "open_edge":
      return `You reopened road ${road}`;
    case "reduce_shelter_capacity":
      return `You reduced capacity of shelter ${str(payload.shelter_id) ?? "?"} to ${num(payload.new_capacity) ?? "?"}`;
    default:
      return "You applied a disruption";
  }
}

/** One plain-language sentence for an event. The raw payload stays available in the UI. */
export function describeEvent(event: RunEvent, nodes: ScenarioNode[], edges: ScenarioEdge[] = []): string {
  const payload = event.payload;
  switch (event.event_type) {
    case "run_started":
      return `Started a ${str(payload.strategy) ?? ""} run with seed ${num(payload.seed) ?? "?"}`.replace("  ", " ");
    case "priority_computed": {
      const priorities = asRecord(payload.priorities);
      if (!priorities) return "Ranked incidents by priority";
      const ranked = Object.entries(priorities)
        .map(([id, score]) => [id, num(score)] as const)
        .filter((entry): entry is readonly [string, number] => entry[1] !== null)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const top = ranked[0];
      return top
        ? `Ranked ${ranked.length} incident${ranked.length === 1 ? "" : "s"}; highest priority is ${top[0]} (score ${top[1].toFixed(2)})`
        : "Ranked incidents by priority";
    }
    case "allocation_committed":
    case "incident_unserved": {
      const action = asRecord(payload.action);
      return action ? describeAction(action, nodes) : "Committed an allocation";
    }
    case "proposal_rejected": {
      const action = asRecord(payload.action);
      const errors = Array.isArray(payload.errors) ? payload.errors.map(asRecord) : [];
      const issue = errors.map((item) => str(item?.issue)).find((item) => item !== null);
      const what = action ? describeAction(action, nodes).replace(/^(Sent|Placed)/, "Proposed to send") : "A proposal";
      return `Rejected: ${what}${issue ? `. Reason: ${issue}` : ""}`;
    }
    case "disruption_applied":
      return describeDisruption(payload, nodes, edges);
    case "replan_started":
      return "Started replanning after the disruption";
    case "replan_completed":
      return `Replanning finished with status ${str(payload.status) ?? "unknown"}`;
    case "run_completed":
      return `Run finished with status ${str(payload.status) ?? "unknown"}`;
    case "no_progress":
      return "Stopped planning: no further assignments were possible";
    case "max_steps_reached":
      return "Stopped planning: the coordinator step limit was reached";
    default:
      return event.event_type.replaceAll("_", " ");
  }
}

/** Latest priority scores recorded by the prioritizer, if any. */
export function latestPriorities(events: RunEvent[]): Record<string, number> {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.event_type !== "priority_computed") continue;
    const priorities = asRecord(event.payload.priorities);
    if (!priorities) continue;
    const result: Record<string, number> = {};
    for (const [id, score] of Object.entries(priorities)) {
      const value = num(score);
      if (value !== null) result[id] = value;
    }
    return result;
  }
  return {};
}
