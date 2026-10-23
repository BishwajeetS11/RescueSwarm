import { Badge } from "../../components/ui/Badge";
import type { RunDetail, Scenario } from "../../lib/api/types";
import { nodeLabel } from "../../lib/graph";
import styles from "./scenarios.module.css";

type Props = { scenario: Scenario; run?: RunDetail };

type UnitView = { id: string; node_id: string; status?: string; assigned_incident_id?: string | null };

function unitViews(scenario: Scenario, run?: RunDetail): UnitView[] {
  if (!run) return scenario.medical_units.map((unit) => ({ id: unit.id, node_id: unit.node_id }));
  return run.state.medical_units.map((unit) => ({
    id: String(unit["id"] ?? ""),
    node_id: String(unit["node_id"] ?? ""),
    status: typeof unit["status"] === "string" ? unit["status"] : undefined,
    assigned_incident_id:
      typeof unit["assigned_incident_id"] === "string" ? unit["assigned_incident_id"] : null,
  }));
}

export function ResourceInventory({ scenario, run }: Props) {
  const nodes = scenario.nodes;
  const shelters = run?.state.shelters ?? scenario.shelters;
  const stocks = run?.state.supply_stocks ?? scenario.supply_stocks;
  const initialKits = new Map(scenario.supply_stocks.map((stock) => [stock.id, stock.kits_available]));

  return (
    <div className={styles.inventory}>
      <div className={styles.inventoryBlock}>
        <h3>Medical units</h3>
        {scenario.medical_units.length === 0 ? (
          <p className={styles.muted}>None in this scenario.</p>
        ) : (
          <ul className={styles.list}>
            {unitViews(scenario, run).map((unit) => (
              <li key={unit.id}>
                <span>
                  <strong>{unit.id}</strong> at {nodeLabel(nodes, unit.node_id)}
                </span>
                {run ? (
                  unit.status === "assigned" ? (
                    <Badge tone="info">To {unit.assigned_incident_id ?? "incident"}</Badge>
                  ) : unit.status === "unavailable" ? (
                    <Badge tone="danger">Unavailable</Badge>
                  ) : (
                    <Badge tone="neutral">Idle</Badge>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.inventoryBlock}>
        <h3>Shelters</h3>
        {shelters.length === 0 ? (
          <p className={styles.muted}>None in this scenario.</p>
        ) : (
          <ul className={styles.list}>
            {shelters.map((shelter) => {
              const share = shelter.capacity > 0 ? shelter.used_capacity / shelter.capacity : 0;
              return (
                <li key={shelter.id}>
                  <span>
                    <strong>{shelter.id}</strong> at {nodeLabel(nodes, shelter.node_id)}
                  </span>
                  <span>
                    {shelter.used_capacity} of {shelter.capacity} seats used
                  </span>
                  <div className={styles.bar} aria-hidden="true">
                    <div className={styles.barFill} style={{ width: `${Math.round(share * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.inventoryBlock}>
        <h3>Aid-kit depots</h3>
        {stocks.length === 0 ? (
          <p className={styles.muted}>None in this scenario.</p>
        ) : (
          <ul className={styles.list}>
            {stocks.map((stock) => {
              const initial = initialKits.get(stock.id) ?? stock.kits_available;
              const share = initial > 0 ? stock.kits_available / initial : 0;
              return (
                <li key={stock.id}>
                  <span>
                    <strong>{stock.id}</strong> at {nodeLabel(nodes, stock.node_id)}
                  </span>
                  <span>
                    {stock.kits_available}
                    {run ? ` of ${initial}` : ""} kits {run ? "left" : "in stock"}
                  </span>
                  <div className={styles.bar} aria-hidden="true">
                    <div className={styles.barFill} style={{ width: `${Math.round(share * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
