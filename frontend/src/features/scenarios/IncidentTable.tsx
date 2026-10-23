import { Badge } from "../../components/ui/Badge";
import { TableWrap } from "../../components/ui/TableWrap";
import type { Incident, ScenarioNode } from "../../lib/api/types";
import { nodeLabel } from "../../lib/graph";
import { incidentStatusInfo } from "../../lib/labels";
import styles from "./scenarios.module.css";

type Shortfall = { medical: number; shelter: number; kits: number };

type Props = {
  incidents: Incident[];
  nodes: ScenarioNode[];
  /** Priority scores from the prioritizer, when a run exists. */
  priorities?: Record<string, number>;
  showStatus?: boolean;
  unmet?: { medical: Record<string, number>; shelter: Record<string, number>; kits: Record<string, number> };
};

function needs(incident: Incident): string {
  const parts = [
    incident.medical_units_required ? `${incident.medical_units_required} medical` : null,
    incident.shelter_demand ? `${incident.shelter_demand} shelter seats` : null,
    incident.kits_required ? `${incident.kits_required} kits` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "none";
}

function shortfallText(shortfall: Shortfall): string {
  const parts = [
    shortfall.medical ? `${shortfall.medical} medical` : null,
    shortfall.shelter ? `${shortfall.shelter} seats` : null,
    shortfall.kits ? `${shortfall.kits} kits` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function Urgency({ value }: { value: number }) {
  return (
    <span className={styles.urgency} role="img" aria-label={`Urgency ${value} of 5`}>
      <span aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span key={index} className={index < value ? styles.pipOn : styles.pip} />
        ))}
      </span>
      <span aria-hidden="true">{value}/5</span>
    </span>
  );
}

export function IncidentTable({ incidents, nodes, priorities, showStatus = false, unmet }: Props) {
  const ranked = priorities
    ? [...incidents].sort((a, b) => (priorities[b.id] ?? 0) - (priorities[a.id] ?? 0) || a.id.localeCompare(b.id))
    : incidents;
  return (
    <TableWrap label="Incidents">
      <thead>
        <tr>
          {priorities ? <th scope="col">Rank</th> : null}
          <th scope="col">Incident</th>
          <th scope="col">Location</th>
          <th scope="col">Urgency</th>
          <th scope="col" data-numeric>
            People
          </th>
          <th scope="col">Needs</th>
          {priorities ? (
            <th scope="col" data-numeric>
              Priority
            </th>
          ) : null}
          {showStatus ? <th scope="col">Status</th> : null}
          {unmet ? <th scope="col">Still missing</th> : null}
        </tr>
      </thead>
      <tbody>
        {ranked.map((incident, index) => {
          const info = incidentStatusInfo(incident.status);
          return (
            <tr key={incident.id}>
              {priorities ? <td>{index + 1}</td> : null}
              <th scope="row">
                {incident.label}
                <span className={styles.subId}>{incident.id}</span>
              </th>
              <td>{nodeLabel(nodes, incident.node_id)}</td>
              <td>
                <Urgency value={incident.urgency} />
              </td>
              <td data-numeric>{incident.people_affected}</td>
              <td>{needs(incident)}</td>
              {priorities ? <td data-numeric>{priorities[incident.id]?.toFixed(2) ?? "—"}</td> : null}
              {showStatus ? (
                <td>
                  <Badge tone={info.tone}>{info.label}</Badge>
                </td>
              ) : null}
              {unmet ? (
                <td>
                  {shortfallText({
                    medical: unmet.medical[incident.id] ?? 0,
                    shelter: unmet.shelter[incident.id] ?? 0,
                    kits: unmet.kits[incident.id] ?? 0,
                  })}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}
