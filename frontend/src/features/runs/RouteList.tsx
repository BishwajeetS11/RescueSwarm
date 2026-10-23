import type { RunDetail } from "../../lib/api/types";
import { describeRoute } from "../../lib/graph";
import styles from "./runs.module.css";

type Props = { run: RunDetail };

/** Text equivalent of the map's highlighted routes (not color- or vision-dependent). */
export function RouteList({ run }: Props) {
  const nodes = run.scenario.nodes;
  const { medical_assignments: medical, supply_assignments: supply, shelter_assignments: shelter } = run.state;
  const total = medical.length + supply.length + shelter.length;
  if (total === 0) {
    return <p className={styles.muted}>No assignments were committed in this run.</p>;
  }
  return (
    <ul className={styles.routeList}>
      {medical.map((item) => (
        <li key={`m-${item.unit_id}-${item.incident_id}`}>
          <strong>Medical {item.unit_id}</strong> → {item.incident_id}: {describeRoute(nodes, item.route)} (cost{" "}
          {item.route_cost})
        </li>
      ))}
      {supply.map((item) => (
        <li key={`s-${item.stock_id}-${item.incident_id}`}>
          <strong>
            {item.kits} kits from {item.stock_id}
          </strong>{" "}
          → {item.incident_id}: {describeRoute(nodes, item.route)}
        </li>
      ))}
      {shelter.map((item) => (
        <li key={`h-${item.shelter_id}-${item.incident_id}`}>
          <strong>
            {item.people} people → shelter {item.shelter_id}
          </strong>{" "}
          from {item.incident_id}
        </li>
      ))}
    </ul>
  );
}
