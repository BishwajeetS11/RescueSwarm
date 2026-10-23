import { useId, type KeyboardEvent } from "react";

import type { NodeKind, RunDetail, Scenario, ScenarioEdge } from "../lib/api/types";
import { curvedEdge, describeEdge, edgeKey, layoutNodes, routeEdgeKeys, type Point } from "../lib/graph";
import { nodeKindLabel } from "../lib/labels";
import styles from "./NetworkGraph.module.css";

const WIDTH = 760;
const HEIGHT = 440;
const NODE_RADIUS = 18;

type Props = {
  scenario: Scenario;
  run?: RunDetail;
  selectedEdgeId?: string | null;
  /** When provided, roads become keyboard-selectable controls. */
  onSelectEdge?: (edgeId: string) => void;
};

const KIND_LETTER: Record<NodeKind, string> = {
  resource_base: "B",
  supply_depot: "D",
  shelter: "S",
  incident_site: "!",
  junction: "",
  mixed: "+",
};

function NodeShape({ kind }: { kind: NodeKind }) {
  switch (kind) {
    case "resource_base":
      return <rect x={-14} y={-14} width={28} height={28} rx={5} />;
    case "supply_depot":
      return <polygon points="-16,0 -8,-14 8,-14 16,0 8,14 -8,14" />;
    case "shelter":
      return <polygon points="0,-17 16,-5 16,14 -16,14 -16,-5" />;
    case "incident_site":
      return <polygon points="0,-19 19,0 0,19 -19,0" />;
    case "junction":
      return <circle r={8} />;
    case "mixed":
      return <circle r={15} />;
  }
}

function truncate(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const STATUS_GLYPH: Record<string, { glyph: string; className: string; text: string }> = {
  assigned: { glyph: "✓", className: styles.statusOk ?? "", text: "fully served" },
  partially_assigned: { glyph: "~", className: styles.statusWarn ?? "", text: "partly served" },
  unserved: { glyph: "✕", className: styles.statusBad ?? "", text: "unserved" },
};

export function NetworkGraph({ scenario, run, selectedEdgeId, onSelectEdge }: Props) {
  const markerBase = useId().replace(/:/g, "");
  const positions = layoutNodes(scenario.nodes, WIDTH, HEIGHT);
  const edges = run?.state.edges ?? scenario.edges;
  const medicalKeys = routeEdgeKeys(run?.state.medical_assignments.map((item) => item.route) ?? []);
  const supplyKeys = routeEdgeKeys(run?.state.supply_assignments.map((item) => item.route) ?? []);
  const incidentStatus = new Map((run?.state.incidents ?? []).map((incident) => [incident.id, incident.status]));
  const closedCount = edges.filter((edge) => !edge.available).length;

  const summary = `Network map with ${scenario.nodes.length} places and ${edges.length} one-way roads${
    closedCount ? `, ${closedCount} closed` : ""
  }. ${onSelectEdge ? "Roads can be selected with the keyboard." : ""}`;

  const edgeClass = (edge: ScenarioEdge): string => {
    const key = edgeKey(edge);
    if (!edge.available) return styles.closed ?? "";
    if (medicalKeys.has(key)) return styles.medical ?? "";
    if (supplyKeys.has(key)) return styles.supply ?? "";
    return styles.open ?? "";
  };

  const markerFor = (edge: ScenarioEdge): string => {
    const key = edgeKey(edge);
    if (!edge.available) return `${markerBase}-closed`;
    if (medicalKeys.has(key)) return `${markerBase}-medical`;
    if (supplyKeys.has(key)) return `${markerBase}-supply`;
    return `${markerBase}-open`;
  };

  const onKey = (event: KeyboardEvent, edgeId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectEdge?.(edgeId);
    }
  };

  return (
    <figure className={styles.figure}>
      <div className={styles.scroller} role="region" aria-label="Network map (scrolls sideways on small screens)" tabIndex={0}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={summary} className={styles.svg}>
        <defs>
          {(["open", "closed", "medical", "supply"] as const).map((variant) => (
            <marker
              key={variant}
              id={`${markerBase}-${variant}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className={styles[`marker_${variant}`]} />
            </marker>
          ))}
        </defs>

        {edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          const curve = curvedEdge(from, to, NODE_RADIUS + 3);
          const selected = selectedEdgeId === edge.id;
          const used = medicalKeys.has(edgeKey(edge)) || supplyKeys.has(edgeKey(edge));
          const label = `${describeEdge(scenario.nodes, edge)}, cost ${edge.cost}, ${edge.available ? "open" : "closed"}`;
          return (
            <g key={edge.id}>
              {selected ? <path d={curve.path} className={styles.halo} /> : null}
              <path
                d={curve.path}
                className={`${styles.edge} ${edgeClass(edge)} ${used ? styles.used : ""}`}
                markerEnd={`url(#${markerFor(edge)})`}
              />
              {onSelectEdge ? (
                <path
                  d={curve.path}
                  className={styles.hit}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${label}. Select for disruption.`}
                  onClick={() => onSelectEdge(edge.id)}
                  onKeyDown={(event) => onKey(event, edge.id)}
                >
                  <title>{label}</title>
                </path>
              ) : (
                <title>{label}</title>
              )}
              <CostLabel point={curve.label} text={`${edge.available ? "" : "✕ "}${edge.cost}`} closed={!edge.available} />
            </g>
          );
        })}

        {scenario.nodes.map((node) => {
          const point = positions.get(node.id);
          if (!point) return null;
          const nodeStatus = scenario.incidents
            .filter((incident) => incident.node_id === node.id)
            .map((incident) => incidentStatus.get(incident.id))
            .find((value) => value !== undefined && value !== "pending");
          const badge = STATUS_GLYPH[nodeStatus ?? ""];
          return (
            <g key={node.id} transform={`translate(${point.x} ${point.y})`} className={`${styles.node} ${styles[`kind_${node.kind}`]}`}>
              <title>{`${node.label} (${nodeKindLabel(node.kind)})${badge ? `, ${badge.text}` : ""}`}</title>
              <NodeShape kind={node.kind} />
              <text className={styles.letter} y={5} textAnchor="middle">
                {KIND_LETTER[node.kind]}
              </text>
              {badge ? (
                <g transform="translate(15 -15)" className={badge.className}>
                  <circle r={9} />
                  <text y={4} textAnchor="middle" className={styles.badgeGlyph}>
                    {badge.glyph}
                  </text>
                </g>
              ) : null}
              <NodeName label={node.label} angle={point.angle} />
            </g>
          );
        })}
      </svg>
      </div>
      <GraphLegend hasRun={Boolean(run)} />
    </figure>
  );
}

function CostLabel({ point, text, closed }: { point: Point; text: string; closed: boolean }) {
  return (
    <text x={point.x} y={point.y + 3} textAnchor="middle" className={`${styles.cost} ${closed ? styles.costClosed : ""}`}>
      {text}
    </text>
  );
}

function NodeName({ label, angle }: { label: string; angle: number }) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const anchor = dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle";
  return (
    <text
      x={dx * 30}
      y={dy * 30 + (Math.abs(dx) <= 0.35 ? (dy > 0 ? 12 : -4) : 4)}
      textAnchor={anchor}
      className={styles.name}
    >
      {truncate(label)}
    </text>
  );
}

function GraphLegend({ hasRun }: { hasRun: boolean }) {
  return (
    <figcaption className={styles.legend}>
      <ul className={styles.legendList} aria-label="Map legend">
        <li>
          <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true" className={styles.swatchNode}>
            <rect x={-9} y={-9} width={18} height={18} rx={4} />
          </svg>
          Resource base (B)
        </li>
        <li>
          <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true" className={styles.swatchNode}>
            <polygon points="-11,0 -5,-10 5,-10 11,0 5,10 -5,10" />
          </svg>
          Supply depot (D)
        </li>
        <li>
          <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true" className={styles.swatchNode}>
            <polygon points="0,-11 10,-3 10,9 -10,9 -10,-3" />
          </svg>
          Shelter (S)
        </li>
        <li>
          <svg width="22" height="22" viewBox="-12 -12 24 24" aria-hidden="true" className={styles.swatchNode}>
            <polygon points="0,-11 11,0 0,11 -11,0" />
          </svg>
          Incident (!)
        </li>
        <li>
          <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
            <line x1="2" y1="6" x2="28" y2="6" className={`${styles.edge} ${styles.open}`} />
          </svg>
          Open road
        </li>
        <li>
          <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
            <line x1="2" y1="6" x2="28" y2="6" className={`${styles.edge} ${styles.closed}`} />
          </svg>
          Closed road (✕)
        </li>
        {hasRun ? (
          <>
            <li>
              <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
                <line x1="2" y1="6" x2="28" y2="6" className={`${styles.edge} ${styles.medical} ${styles.used}`} />
              </svg>
              Medical route (solid)
            </li>
            <li>
              <svg width="30" height="12" viewBox="0 0 30 12" aria-hidden="true">
                <line x1="2" y1="6" x2="28" y2="6" className={`${styles.edge} ${styles.supply} ${styles.used}`} />
              </svg>
              Kit route (dotted)
            </li>
            <li>
              <span className={styles.legendBadge} aria-hidden="true">
                ✓ ~ ✕
              </span>
              Incident served / partly / unserved
            </li>
          </>
        ) : null}
      </ul>
      <p className={styles.legendNote}>Numbers on roads are synthetic travel costs, not minutes or distance.</p>
    </figcaption>
  );
}
