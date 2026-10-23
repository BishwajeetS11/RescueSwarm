import type { Incident, NodeKind, ScenarioNode } from "./api/types";

type Rec = Record<string, unknown>;

export type DraftPreview = {
  name: string;
  description: string;
  nodes: ScenarioNode[];
  incidents: Incident[];
  counts: { nodes: number; edges: number; incidents: number; units: number; shelters: number; stocks: number };
};

const KINDS: NodeKind[] = ["incident_site", "resource_base", "shelter", "junction", "supply_depot", "mixed"];

function isRec(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): Rec[] {
  return Array.isArray(value) ? value.filter(isRec) : [];
}

const text = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const number = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/**
 * Read-only, defensive view of an untrusted draft for the review screen.
 * The backend remains the validator; malformed entries are simply skipped here.
 */
export function previewDraft(draft: Rec): DraftPreview {
  const nodes: ScenarioNode[] = list(draft.nodes).map((node) => {
    const kind = KINDS.find((item) => item === node.kind) ?? "junction";
    return { id: text(node.id), label: text(node.label, text(node.id)), kind };
  });
  const incidents: Incident[] = list(draft.incidents).map((item) => ({
    id: text(item.id, "incident"),
    label: text(item.label, text(item.id, "Incident")),
    node_id: text(item.node_id),
    category: text(item.category, "other"),
    urgency: number(item.urgency, 1),
    people_affected: number(item.people_affected),
    time_sensitivity: number(item.time_sensitivity),
    access_risk: number(item.access_risk),
    medical_units_required: number(item.medical_units_required),
    kits_required: number(item.kits_required),
    shelter_demand: number(item.shelter_demand),
    status: text(item.status, "pending"),
  }));
  return {
    name: text(draft.name, "Untitled draft"),
    description: text(draft.description),
    nodes,
    incidents,
    counts: {
      nodes: nodes.length,
      edges: list(draft.edges).length,
      incidents: incidents.length,
      units: list(draft.medical_units).length,
      shelters: list(draft.shelters).length,
      stocks: list(draft.supply_stocks).length,
    },
  };
}
